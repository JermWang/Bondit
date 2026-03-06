import { createHash } from "crypto";

const PROGRAM_EVENT_NAMES = {
  launchFactory: ["LaunchCreated", "LaunchGraduated", "LaunchFlightMode"],
  bondingCurve: ["CurveInitialized", "TradeExecuted", "GraduationTriggered", "PriceQuote"],
  agencyVaults: ["VaultsInitialized", "TreasuryReleased", "CompoundRecorded", "FlightModeActivated", "EmergencyPaused", "EmergencyUnpaused"],
  policyEngine: ["PolicyEngineInitialized", "MonitorExecuted", "DailyExecutionCompleted", "RebalanceExecuted", "FlightModeTriggered", "KeeperUpdated"],
  venueAdapters: ["AdapterInitialized", "PoolCreated", "LiquidityAdded", "FeesHarvested", "PositionRebalanced"],
} as const;

export type IndexedProgramName = keyof typeof PROGRAM_EVENT_NAMES;

export interface IndexedEventDefinition {
  program: IndexedProgramName;
  eventName: string;
  discriminator: string;
}

function anchorEventDiscriminator(eventName: string): string {
  return createHash("sha256").update(`event:${eventName}`).digest("hex").slice(0, 16);
}

const EVENT_DEFINITIONS: IndexedEventDefinition[] = Object.entries(PROGRAM_EVENT_NAMES).flatMap(([program, eventNames]) =>
  eventNames.map((eventName) => ({
    program: program as IndexedProgramName,
    eventName,
    discriminator: anchorEventDiscriminator(eventName),
  })),
);

const EVENT_DEFINITION_MAP = new Map(EVENT_DEFINITIONS.map((definition) => [definition.discriminator, definition]));

export function resolveIndexedEvent(discriminator: string): IndexedEventDefinition | undefined {
  return EVENT_DEFINITION_MAP.get(discriminator);
}

export function listIndexedEvents(): IndexedEventDefinition[] {
  return EVENT_DEFINITIONS;
}
