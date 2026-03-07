import type { Pool } from "pg";
import { logger } from "./logger";
import type { IndexedEventEnvelope } from "./event-store";

function getStringField(event: IndexedEventEnvelope, field: string): string | null {
  const value = event.decodedPayload?.[field];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function getBooleanField(event: IndexedEventEnvelope, field: string): boolean | null {
  const value = event.decodedPayload?.[field];
  return typeof value === "boolean" ? value : null;
}

function getNumberField(event: IndexedEventEnvelope, field: string, fallback = 0): number {
  const value = event.decodedPayload?.[field];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function getEventTimestampMs(event: IndexedEventEnvelope): number {
  const raw = event.decodedPayload?.timestamp;
  if (typeof raw === "string" || typeof raw === "number") {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      return parsed * 1000;
    }
  }
  return event.receivedAt;
}

function getLaunchStatus(eventName: string): number {
  switch (eventName) {
    case "LaunchGraduated":
      return 1;
    case "LaunchFlightMode":
      return 2;
    default:
      return 0;
  }
}

type LaunchCreatedSeed = {
  created_at_ms: number;
  creator: string | null;
  launch_mode: string | null;
  mint: string | null;
  name: string | null;
  symbol: string | null;
};

async function getLaunchTreasurySupply(pool: Pool, launchId: string): Promise<number | null> {
  const result = await pool.query<{ treasury_supply: string | null }>(
    `
      SELECT decoded_payload->>'treasury_supply' AS treasury_supply
      FROM indexed_events
      WHERE event_name = 'LaunchCreated'
        AND decoded_payload->>'launch_id' = $1
      ORDER BY received_at DESC
      LIMIT 1
    `,
    [launchId],
  );

  const raw = result.rows[0]?.treasury_supply;
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

async function getLaunchCreatedSeed(pool: Pool, launchId: string): Promise<LaunchCreatedSeed | null> {
  const result = await pool.query<LaunchCreatedSeed>(
    `
      SELECT
        EXTRACT(EPOCH FROM received_at) * 1000 AS created_at_ms,
        decoded_payload->>'creator' AS creator,
        decoded_payload->>'launch_mode' AS launch_mode,
        decoded_payload->>'mint' AS mint,
        decoded_payload->>'name' AS name,
        decoded_payload->>'symbol' AS symbol
      FROM indexed_events
      WHERE event_name = 'LaunchCreated'
        AND decoded_payload->>'launch_id' = $1
      ORDER BY received_at DESC
      LIMIT 1
    `,
    [launchId],
  );

  const row = result.rows[0];
  if (!row?.creator || !row.mint || !row.name || !row.symbol) {
    return null;
  }

  return row;
}

async function ensureLaunchRow(pool: Pool, launchId: string, mint?: string | null): Promise<boolean> {
  const existing = await pool.query<{ launch_id: string }>(
    `SELECT launch_id FROM launches WHERE launch_id = $1 LIMIT 1`,
    [launchId],
  );
  if (existing.rows[0]) {
    return true;
  }

  const seed = await getLaunchCreatedSeed(pool, launchId);
  if (!seed) {
    logger.warn({ launchId }, "SchemaWriter: skipping projection until LaunchCreated metadata is indexed");
    return false;
  }

  await pool.query(
    `
      INSERT INTO launches (
        launch_id,
        creator,
        mint,
        name,
        symbol,
        launch_mode,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (launch_id) DO NOTHING
    `,
    [
      launchId,
      seed.creator,
      mint ?? seed.mint,
      seed.name,
      seed.symbol,
      Number(seed.launch_mode ?? 0),
      0,
    ],
  );
  return true;
}

async function persistLaunchProjection(pool: Pool, event: IndexedEventEnvelope): Promise<boolean> {
  const launchId = getStringField(event, "launch_id");
  if (!launchId) return false;

  if (event.eventName === "LaunchCreated") {
    await pool.query(
      `
        INSERT INTO launches (
          launch_id,
          creator,
          mint,
          name,
          symbol,
          launch_mode,
          status,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8 / 1000.0))
        ON CONFLICT (launch_id) DO UPDATE SET
          creator = EXCLUDED.creator,
          mint = EXCLUDED.mint,
          name = EXCLUDED.name,
          symbol = EXCLUDED.symbol,
          launch_mode = EXCLUDED.launch_mode,
          status = EXCLUDED.status
      `,
      [
        launchId,
        getStringField(event, "creator"),
        getStringField(event, "mint"),
        getStringField(event, "name"),
        getStringField(event, "symbol"),
        Number(getStringField(event, "launch_mode") ?? 0),
        0,
        getEventTimestampMs(event),
      ],
    );
    return true;
  }

  if (event.eventName === "LaunchGraduated") {
    if (!(await ensureLaunchRow(pool, launchId, getStringField(event, "mint")))) return false;
    await pool.query(
      `
        UPDATE launches
        SET
          mint = COALESCE($2, mint),
          policy_state = COALESCE($3, policy_state),
          adapter_state = COALESCE($4, adapter_state),
          status = $5,
          graduated_at = to_timestamp($6 / 1000.0)
        WHERE launch_id = $1
      `,
      [
        launchId,
        getStringField(event, "mint"),
        getStringField(event, "policy_state"),
        getStringField(event, "adapter_state"),
        getLaunchStatus(event.eventName),
        getEventTimestampMs(event),
      ],
    );
    return true;
  }

  if (event.eventName === "LaunchFlightMode") {
    if (!(await ensureLaunchRow(pool, launchId, getStringField(event, "mint")))) return false;
    await pool.query(
      `
        UPDATE launches
        SET
          mint = COALESCE($2, mint),
          status = $3,
          flight_mode_at = to_timestamp($4 / 1000.0)
        WHERE launch_id = $1
      `,
      [launchId, getStringField(event, "mint"), getLaunchStatus(event.eventName), getEventTimestampMs(event)],
    );
    return true;
  }

  return false;
}

async function persistTradeProjection(pool: Pool, event: IndexedEventEnvelope): Promise<boolean> {
  if (event.eventName !== "TradeExecuted") return false;

  const launchId = getStringField(event, "launch_id");
  if (!launchId) return false;

  if (!(await ensureLaunchRow(pool, launchId, null))) return false;

  await pool.query(
    `
      INSERT INTO trades (
        launch_id,
        trader,
        is_buy,
        sol_amount,
        token_amount,
        fee,
        tokens_sold_after,
        raised_sol_after,
        tx_signature,
        slot,
        timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11 / 1000.0))
      ON CONFLICT (tx_signature) DO NOTHING
    `,
    [
      launchId,
      getStringField(event, "trader") ?? "unknown",
      getBooleanField(event, "is_buy") ?? false,
      getStringField(event, "sol_amount") ?? "0",
      getStringField(event, "token_amount") ?? "0",
      getStringField(event, "fee") ?? "0",
      getStringField(event, "tokens_sold_after") ?? "0",
      getStringField(event, "raised_sol_after") ?? "0",
      event.signature,
      0,
      getEventTimestampMs(event),
    ],
  );

  return true;
}

function policyActionDescription(event: IndexedEventEnvelope): string {
  switch (event.eventName) {
    case "TreasuryReleased":
      return "Released treasury inventory according to the active charter.";
    case "CompoundRecorded":
      return "Recorded fee compounding across LP and house buckets.";
    case "FlightModeActivated":
    case "FlightModeTriggered":
      return "Launch transitioned into flight-mode handling.";
    case "EmergencyPaused":
      return "Emergency pause activated by the circuit breaker authority.";
    case "EmergencyUnpaused":
      return "Emergency pause lifted and normal operations resumed.";
    case "DailyExecutionCompleted":
      return "Completed the deterministic daily execution cycle.";
    case "RebalanceExecuted":
      return "Rebalanced venue liquidity placement.";
    case "KeeperUpdated":
      return "Updated the keeper authority for this launch.";
    default:
      return `Recorded ${event.eventName} action.`;
  }
}

async function persistPolicyActionProjection(pool: Pool, event: IndexedEventEnvelope): Promise<boolean> {
  const supportedEvents = new Set([
    "TreasuryReleased",
    "CompoundRecorded",
    "FlightModeActivated",
    "EmergencyPaused",
    "EmergencyUnpaused",
    "DailyExecutionCompleted",
    "RebalanceExecuted",
    "FlightModeTriggered",
    "KeeperUpdated",
  ]);

  if (!supportedEvents.has(event.eventName)) return false;

  const launchId = getStringField(event, "launch_id");
  if (!launchId) return false;

  if (!(await ensureLaunchRow(pool, launchId, null))) return false;

  await pool.query(
    `
      INSERT INTO policy_actions (
        launch_id,
        action_type,
        action_index,
        description,
        amounts,
        tx_signature,
        slot,
        timestamp
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, to_timestamp($8 / 1000.0))
      ON CONFLICT (tx_signature) DO NOTHING
    `,
    [
      launchId,
      event.eventName,
      Number(getStringField(event, "action_index") ?? event.receivedAt),
      policyActionDescription(event),
      event.decodedPayload ? JSON.stringify(event.decodedPayload) : JSON.stringify({}),
      event.signature,
      0,
      getEventTimestampMs(event),
    ],
  );

  return true;
}

async function persistHolderSnapshotProjection(pool: Pool, event: IndexedEventEnvelope): Promise<boolean> {
  if (event.eventName !== "MonitorExecuted") return false;

  const launchId = getStringField(event, "launch_id");
  if (!launchId) return false;

  if (!(await ensureLaunchRow(pool, launchId, null))) return false;

  await pool.query(
    `
      INSERT INTO holder_snapshots (
        launch_id,
        holders_count,
        top10_concentration_bps,
        top10_holders,
        snapshot_at
      )
      VALUES ($1, $2, $3, $4::jsonb, to_timestamp($5 / 1000.0))
    `,
    [
      launchId,
      Number(getStringField(event, "holders_count") ?? 0),
      Number(getStringField(event, "top10_concentration_bps") ?? 0),
      JSON.stringify([]),
      getEventTimestampMs(event),
    ],
  );

  return true;
}

async function persistMarketMetricProjection(pool: Pool, event: IndexedEventEnvelope): Promise<boolean> {
  const launchId = getStringField(event, "launch_id");
  if (!launchId) return false;

  if (event.eventName !== "MonitorExecuted" && event.eventName !== "PriceQuote") {
    return false;
  }

  if (!(await ensureLaunchRow(pool, launchId, null))) return false;

  const priceNumerator = event.eventName === "PriceQuote" ? getNumberField(event, "current_price_num") : null;
  const priceDenominator = event.eventName === "PriceQuote" ? getNumberField(event, "current_price_den") : null;
  const derivedPriceSol = priceNumerator !== null && priceDenominator !== null && priceDenominator > 0
    ? priceNumerator / priceDenominator
    : null;

  await pool.query(
    `
      INSERT INTO market_metrics (
        launch_id,
        price_usd,
        price_sol,
        volume_1h_usd,
        volume_24h_usd,
        volatility_1h_bps,
        volatility_24h_bps,
        recorded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8 / 1000.0))
    `,
    [
      launchId,
      null,
      derivedPriceSol,
      null,
      event.eventName === "MonitorExecuted" ? Number(getStringField(event, "volume_24h_usd") ?? 0) : null,
      event.eventName === "MonitorExecuted" ? Number(getStringField(event, "volatility_1h_bps") ?? 0) : null,
      null,
      getEventTimestampMs(event),
    ],
  );

  return true;
}

async function persistTreasurySnapshotProjection(pool: Pool, event: IndexedEventEnvelope): Promise<boolean> {
  if (event.eventName !== "TreasuryReleased") return false;

  const launchId = getStringField(event, "launch_id");
  if (!launchId) return false;

  if (!(await ensureLaunchRow(pool, launchId, null))) return false;

  const remaining = getNumberField(event, "treasury_remaining");
  const releasedAmount = getNumberField(event, "amount");
  const treasurySupply = await getLaunchTreasurySupply(pool, launchId);
  const remainingPct = treasurySupply && treasurySupply > 0
    ? Number(((remaining / treasurySupply) * 100).toFixed(2))
    : 0;
  const releasedTotal = treasurySupply && treasurySupply >= remaining
    ? Math.max(treasurySupply - remaining, releasedAmount)
    : releasedAmount;

  await pool.query(
    `
      INSERT INTO treasury_snapshots (
        launch_id,
        remaining,
        remaining_pct,
        released_total,
        released_today,
        released_week,
        snapshot_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))
    `,
    [
      launchId,
      remaining,
      remainingPct,
      releasedTotal,
      releasedAmount,
      releasedAmount,
      getEventTimestampMs(event),
    ],
  );

  return true;
}

async function persistLiquiditySnapshotProjection(pool: Pool, event: IndexedEventEnvelope): Promise<boolean> {
  const supportedEvents = new Set(["PoolCreated", "LiquidityAdded", "FeesHarvested", "PositionRebalanced", "MonitorExecuted"]);
  if (!supportedEvents.has(event.eventName)) return false;

  const launchId = getStringField(event, "launch_id");
  if (!launchId) return false;

  if (!(await ensureLaunchRow(pool, launchId, null))) return false;

  await pool.query(
    `
      INSERT INTO liquidity_snapshots (
        launch_id,
        venue,
        lp_depth_usd,
        depth_2pct_usd,
        depth_5pct_usd,
        total_liquidity_sol,
        total_liquidity_tokens,
        fees_harvested_sol,
        fees_harvested_tokens,
        snapshot_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000.0))
    `,
    [
      launchId,
      event.eventName === "MonitorExecuted" ? "Meteora DLMM" : getStringField(event, "venue") ?? "0",
      event.eventName === "MonitorExecuted" ? getNumberField(event, "lp_depth_usd") : 0,
      null,
      null,
      event.eventName === "LiquidityAdded" ? getStringField(event, "total_sol") ?? "0" : null,
      event.eventName === "LiquidityAdded" ? getStringField(event, "total_tokens") ?? "0" : null,
      event.eventName === "FeesHarvested" ? getStringField(event, "total_harvested_sol") ?? "0" : null,
      event.eventName === "FeesHarvested" ? getStringField(event, "total_harvested_tokens") ?? "0" : null,
      getEventTimestampMs(event),
    ],
  );

  return true;
}

export async function applyStructuredPersistence(pool: Pool, event: IndexedEventEnvelope): Promise<void> {
  if (await persistLaunchProjection(pool, event)) return;
  if (await persistTradeProjection(pool, event)) return;
  if (await persistPolicyActionProjection(pool, event)) return;
  if (await persistHolderSnapshotProjection(pool, event)) return;
  if (await persistMarketMetricProjection(pool, event)) return;
  if (await persistTreasurySnapshotProjection(pool, event)) return;
  if (await persistLiquiditySnapshotProjection(pool, event)) return;

  logger.debug({ eventName: event.eventName, signature: event.signature }, "SchemaWriter: no structured persistence mapping for event yet");
}
