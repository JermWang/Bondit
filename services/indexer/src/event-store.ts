import { logger } from "./logger";
import { ensureRedisConnection, getDatabasePool, getRedisClient } from "./db/client";
import type { DecodedIndexedEvent } from "./event-decoders";
import { applyStructuredPersistence } from "./schema-writers";
import type { IndexedProgramName } from "./events";

export type IndexedStorageTarget =
  | "launches"
  | "trades"
  | "policy_actions"
  | "holder_snapshots"
  | "liquidity_snapshots"
  | "treasury_snapshots"
  | "market_metrics"
  | "emergency_events"
  | "unknown";

export interface IndexedEventEnvelope {
  program: IndexedProgramName;
  eventName: string;
  discriminator: string;
  signature: string;
  storageTarget: IndexedStorageTarget;
  rawBase64: string;
  rawHex: string;
  decodedPayload: DecodedIndexedEvent | null;
  receivedAt: number;
}

const EVENT_STORAGE_TARGETS: Record<string, IndexedStorageTarget> = {
  LaunchCreated: "launches",
  LaunchGraduated: "launches",
  LaunchFlightMode: "launches",
  CurveInitialized: "market_metrics",
  TradeExecuted: "trades",
  GraduationTriggered: "launches",
  PriceQuote: "market_metrics",
  VaultsInitialized: "launches",
  TreasuryReleased: "treasury_snapshots",
  CompoundRecorded: "policy_actions",
  FlightModeActivated: "policy_actions",
  EmergencyPaused: "emergency_events",
  EmergencyUnpaused: "emergency_events",
  PolicyEngineInitialized: "policy_actions",
  MonitorExecuted: "holder_snapshots",
  DailyExecutionCompleted: "policy_actions",
  RebalanceExecuted: "policy_actions",
  FlightModeTriggered: "policy_actions",
  KeeperUpdated: "policy_actions",
  AdapterInitialized: "liquidity_snapshots",
  PoolCreated: "liquidity_snapshots",
  LiquidityAdded: "liquidity_snapshots",
  FeesHarvested: "liquidity_snapshots",
  PositionRebalanced: "liquidity_snapshots",
};

export function resolveStorageTarget(eventName: string): IndexedStorageTarget {
  return EVENT_STORAGE_TARGETS[eventName] ?? "unknown";
}

export interface IndexerEventStore {
  persist(event: IndexedEventEnvelope): Promise<void>;
}

export class MemoryIndexerEventStore implements IndexerEventStore {
  private events: IndexedEventEnvelope[] = [];

  async persist(event: IndexedEventEnvelope): Promise<void> {
    this.events.unshift(event);
    this.events = this.events.slice(0, 250);

    logger.info(
      {
        program: event.program,
        eventName: event.eventName,
        signature: event.signature,
        storageTarget: event.storageTarget,
      },
      "EventStore: buffered normalized event",
    );
  }

  listRecent(limit = 50): IndexedEventEnvelope[] {
    return this.events.slice(0, limit);
  }
}

type DatabasePool = NonNullable<ReturnType<typeof getDatabasePool>>;
type RedisClient = NonNullable<ReturnType<typeof getRedisClient>>;

export class DurableIndexerEventStore implements IndexerEventStore {
  constructor(
    private pool: DatabasePool,
    private redis: RedisClient | null,
  ) {}

  async persist(event: IndexedEventEnvelope): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO indexed_events (
          program,
          event_name,
          discriminator,
          storage_target,
          tx_signature,
          raw_base64,
          raw_hex,
          decoded_payload,
          received_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, to_timestamp($9 / 1000.0))
        ON CONFLICT (tx_signature, event_name, discriminator) DO NOTHING
      `,
      [
        event.program,
        event.eventName,
        event.discriminator,
        event.storageTarget,
        event.signature,
        event.rawBase64,
        event.rawHex,
        event.decodedPayload ? JSON.stringify(event.decodedPayload) : null,
        event.receivedAt,
      ],
    );

    await applyStructuredPersistence(this.pool, event);

    if (this.redis) {
      try {
        await ensureRedisConnection(this.redis);
        await this.redis.lpush("bondit:indexer:indexed_events", JSON.stringify(event));
        await this.redis.ltrim("bondit:indexer:indexed_events", 0, 249);
      } catch (err) {
        logger.warn({ err, signature: event.signature }, "EventStore: redis fan-out failed");
      }
    }

    logger.info(
      {
        program: event.program,
        eventName: event.eventName,
        signature: event.signature,
        storageTarget: event.storageTarget,
      },
      "EventStore: persisted indexed event",
    );
  }
}

export function createIndexerEventStore(): IndexerEventStore {
  const pool = getDatabasePool();
  if (!pool) {
    logger.warn("EventStore: no Postgres/Supabase connection string configured, using memory fallback");
    return new MemoryIndexerEventStore();
  }

  return new DurableIndexerEventStore(pool, getRedisClient());
}
