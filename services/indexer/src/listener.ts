import { Connection, PublicKey } from "@solana/web3.js";
import { logger } from "./logger";
import { decodeIndexedEventPayload } from "./event-decoders";
import { createIndexerEventStore, resolveStorageTarget } from "./event-store";
import { resolveIndexedEvent, type IndexedProgramName } from "./events";

const PROGRAM_IDS = {
  launchFactory: new PublicKey("LFac1111111111111111111111111111111111111111"),
  bondingCurve: new PublicKey("BCrv1111111111111111111111111111111111111111"),
  agencyVaults: new PublicKey("AVlt1111111111111111111111111111111111111111"),
  policyEngine: new PublicKey("PEng1111111111111111111111111111111111111111"),
  venueAdapters: new PublicKey("VAdp1111111111111111111111111111111111111111"),
} satisfies Record<IndexedProgramName, PublicKey>;

/**
 * EventListener subscribes to on-chain program logs and parses events.
 * Events are stored in Supabase/Postgres and cached in Redis.
 */
export class EventListener {
  private subscriptionIds: number[] = [];
  private eventStore = createIndexerEventStore();

  constructor(private connection: Connection) {}

  async start(): Promise<void> {
    logger.info("EventListener: subscribing to program logs...");

    for (const [name, programId] of Object.entries(PROGRAM_IDS) as Array<[IndexedProgramName, PublicKey]>) {
      const subId = this.connection.onLogs(
        programId,
        (logs) => this.handleLogs(name, programId, logs),
        "confirmed"
      );
      this.subscriptionIds.push(subId);
      logger.info(`EventListener: subscribed to ${name} (${programId.toBase58()})`);
    }
  }

  async stop(): Promise<void> {
    for (const subId of this.subscriptionIds) {
      await this.connection.removeOnLogsListener(subId);
    }
    this.subscriptionIds = [];
    logger.info("EventListener: unsubscribed from all programs");
  }

  private handleLogs(programName: IndexedProgramName, programId: PublicKey, logs: any): void {
    if (logs.err) {
      return; // Skip failed transactions
    }

    const signature = logs.signature;
    const logMessages: string[] = logs.logs || [];

    // Parse Anchor events from log data
    for (const msg of logMessages) {
      if (msg.startsWith("Program data:")) {
        const eventData = msg.replace("Program data: ", "");
        void this.processEvent(programName, signature, eventData);
      }
    }
  }

  private async processEvent(programName: IndexedProgramName, signature: string, eventData: string): Promise<void> {
    try {
      // Decode base64 event data
      const buffer = Buffer.from(eventData, "base64");

      // First 8 bytes are the event discriminator
      const discriminator = buffer.slice(0, 8).toString("hex");
      const definition = resolveIndexedEvent(discriminator);

      if (!definition) {
        logger.warn(
          {
            program: programName,
            signature,
            discriminator,
            dataLength: buffer.length,
          },
          "EventListener: unknown event discriminator",
        );
        return;
      }

      const storageTarget = resolveStorageTarget(definition.eventName);
      const decodedPayload = decodeIndexedEventPayload(definition.eventName, buffer.subarray(8));

      logger.info({
        program: programName,
        signature,
        discriminator,
        eventName: definition.eventName,
        storageTarget,
        decoded: Boolean(decodedPayload),
        dataLength: buffer.length,
      }, "EventListener: event received");

      await this.eventStore.persist({
        program: definition.program,
        eventName: definition.eventName,
        discriminator,
        signature,
        storageTarget,
        rawBase64: eventData,
        rawHex: buffer.toString("hex"),
        decodedPayload,
        receivedAt: Date.now(),
      });

    } catch (err) {
      logger.error({ err, programName, signature }, "EventListener: failed to process event");
    }
  }
}
