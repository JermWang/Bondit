import { PublicKey } from "@solana/web3.js";

class BorshCursor {
  private offset = 0;

  constructor(private readonly buffer: Buffer) {}

  private read(length: number): Buffer {
    const chunk = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return chunk;
  }

  u8(): number {
    return this.read(1).readUInt8(0);
  }

  bool(): boolean {
    return this.u8() === 1;
  }

  u16(): number {
    return this.read(2).readUInt16LE(0);
  }

  u32(): number {
    return this.read(4).readUInt32LE(0);
  }

  i32(): number {
    return this.read(4).readInt32LE(0);
  }

  u64(): string {
    return this.read(8).readBigUInt64LE(0).toString();
  }

  i64(): string {
    return this.read(8).readBigInt64LE(0).toString();
  }

  fixedHex(length: number): string {
    return this.read(length).toString("hex");
  }

  fixedText(length: number): string {
    return this.read(length).toString("utf8").replace(/\0+$/g, "");
  }

  pubkey(): string {
    return new PublicKey(this.read(32)).toBase58();
  }

  string(): string {
    const length = this.u32();
    return this.read(length).toString("utf8");
  }
}

export type DecodedIndexedEvent = Record<string, string | number | boolean>;

type EventDecoder = (cursor: BorshCursor) => DecodedIndexedEvent;

const EVENT_DECODERS: Record<string, EventDecoder> = {
  LaunchCreated: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    creator: cursor.pubkey(),
    mint: cursor.pubkey(),
    name: cursor.string(),
    symbol: cursor.string(),
    launch_mode: cursor.u8(),
    curve_supply: cursor.u64(),
    treasury_supply: cursor.u64(),
    lp_reserve_supply: cursor.u64(),
    timestamp: cursor.i64(),
  }),
  LaunchGraduated: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    mint: cursor.pubkey(),
    policy_state: cursor.pubkey(),
    adapter_state: cursor.pubkey(),
    timestamp: cursor.i64(),
  }),
  LaunchFlightMode: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    mint: cursor.pubkey(),
    timestamp: cursor.i64(),
  }),
  CurveInitialized: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    mint: cursor.pubkey(),
    curve_supply: cursor.u64(),
    graduation_target: cursor.u64(),
  }),
  TradeExecuted: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    trader: cursor.pubkey(),
    is_buy: cursor.bool(),
    sol_amount: cursor.u64(),
    token_amount: cursor.u64(),
    fee: cursor.u64(),
    tokens_sold_after: cursor.u64(),
    raised_sol_after: cursor.u64(),
  }),
  GraduationTriggered: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    mint: cursor.pubkey(),
    raised_sol: cursor.u64(),
    tokens_sold: cursor.u64(),
    timestamp: cursor.i64(),
  }),
  PriceQuote: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    is_buy: cursor.bool(),
    input_amount: cursor.u64(),
    output_amount: cursor.u64(),
    fee: cursor.u64(),
    current_price_num: cursor.u64(),
    current_price_den: cursor.u64(),
  }),
  VaultsInitialized: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    mint: cursor.pubkey(),
    treasury_vault: cursor.pubkey(),
    lp_reserve_vault: cursor.pubkey(),
    charter_hash: cursor.fixedHex(32),
  }),
  TreasuryReleased: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    amount: cursor.u64(),
    destination: cursor.u8(),
    treasury_remaining: cursor.u64(),
    action_index: cursor.u64(),
    timestamp: cursor.i64(),
  }),
  CompoundRecorded: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    lp_amount: cursor.u64(),
    house_amount: cursor.u64(),
    total_compounded: cursor.u64(),
    total_house: cursor.u64(),
    action_index: cursor.u64(),
    timestamp: cursor.i64(),
  }),
  FlightModeActivated: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    timestamp: cursor.i64(),
    treasury_remaining: cursor.u64(),
    action_index: cursor.u64(),
  }),
  EmergencyPaused: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    paused_by: cursor.pubkey(),
    timestamp: cursor.i64(),
    action_index: cursor.u64(),
  }),
  EmergencyUnpaused: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    unpaused_by: cursor.pubkey(),
    timestamp: cursor.i64(),
    action_index: cursor.u64(),
  }),
  PolicyEngineInitialized: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    keeper: cursor.pubkey(),
    graduation_timestamp: cursor.i64(),
  }),
  MonitorExecuted: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    holders_count: cursor.u32(),
    top10_concentration_bps: cursor.u16(),
    lp_depth_usd: cursor.u64(),
    volatility_1h_bps: cursor.u16(),
    volume_24h_usd: cursor.u64(),
    day_number: cursor.u32(),
    flight_eligible: cursor.bool(),
    timestamp: cursor.i64(),
  }),
  DailyExecutionCompleted: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    release_amount: cursor.u64(),
    compound_lp_amount: cursor.u64(),
    compound_house_amount: cursor.u64(),
    sell_pressure_cap_bps: cursor.u16(),
    day_number: cursor.u32(),
    timestamp: cursor.i64(),
  }),
  RebalanceExecuted: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    venue: cursor.u8(),
    action_description: cursor.fixedText(64),
    timestamp: cursor.i64(),
  }),
  FlightModeTriggered: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    organic_ready: cursor.bool(),
    max_duration_exceeded: cursor.bool(),
    holders_count: cursor.u32(),
    top10_concentration_bps: cursor.u16(),
    treasury_remaining: cursor.u64(),
    timestamp: cursor.i64(),
  }),
  KeeperUpdated: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    old_keeper: cursor.pubkey(),
    new_keeper: cursor.pubkey(),
    timestamp: cursor.i64(),
  }),
  AdapterInitialized: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    primary_venue: cursor.u8(),
    policy_engine: cursor.pubkey(),
  }),
  PoolCreated: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    venue: cursor.u8(),
    initial_price: cursor.u64(),
    bin_step: cursor.u16(),
    active_id: cursor.i32(),
    timestamp: cursor.i64(),
  }),
  LiquidityAdded: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    venue: cursor.u8(),
    sol_amount: cursor.u64(),
    token_amount: cursor.u64(),
    strategy: cursor.u8(),
    total_sol: cursor.u64(),
    total_tokens: cursor.u64(),
    timestamp: cursor.i64(),
  }),
  FeesHarvested: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    venue: cursor.u8(),
    total_harvested_sol: cursor.u64(),
    total_harvested_tokens: cursor.u64(),
    timestamp: cursor.i64(),
  }),
  PositionRebalanced: (cursor) => ({
    launch_id: cursor.fixedHex(32),
    venue: cursor.u8(),
    new_lower_bin: cursor.i32(),
    new_upper_bin: cursor.i32(),
    total_rebalances: cursor.u64(),
    timestamp: cursor.i64(),
  }),
};

export function decodeIndexedEventPayload(eventName: string, payload: Buffer): DecodedIndexedEvent | null {
  const decoder = EVENT_DECODERS[eventName];
  if (!decoder) {
    return null;
  }

  return decoder(new BorshCursor(payload));
}
