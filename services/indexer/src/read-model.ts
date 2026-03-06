import type { Pool } from "pg";
import type {
  CharterSnapshot,
  HolderEntry,
  LaunchBadgeType,
  LaunchCharterResponse,
  LaunchCurveResponse,
  LaunchDashboardResponse,
  LaunchFeeBreakdownResponse,
  LaunchFlightStatusResponse,
  LaunchHolderStatsResponse,
  LaunchLiquidityStatsResponse,
  LaunchListItem,
  LaunchStatusLabel,
  LaunchTradesResponse,
  LaunchTreasuryResponse,
  LaunchesResponse,
  PolicyActionLog,
} from "@bondit/sdk/api";
import { getDatabasePool } from "./db/client";
import { logger } from "./logger";

const DEFAULT_CHARTER: CharterSnapshot = {
  dailyReleaseRateBps: 20,
  maxDailyRelease: "1000000000000",
  maxWeeklyRelease: "5000000000000",
  sellPressureCapEarlyBps: 400,
  sellPressureCapMatureBps: 100,
  flightHoldersThreshold: 15000,
  flightTop10ConcentrationBps: 1800,
  flightTreasuryRemainingBps: 500,
  maxStewardshipDuration: 15552000,
  houseFeeEndsAtFlight: true,
  feeSplitLpBps: 9900,
  feeSplitHouseBps: 100,
};

const DAY_MS = 24 * 60 * 60 * 1000;

type JsonObject = Record<string, unknown>;
type LaunchOverviewRow = {
  launch_id: string;
  creator: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string | null;
  status: number | string;
  created_at: Date | string;
  graduated_at: Date | string | null;
  flight_mode_at: Date | string | null;
  price_sol: number | string | null;
  previous_price_sol: number | string | null;
  volume_24h_usd: number | string | null;
  lp_depth_usd: number | string | null;
  holders_count: number | string | null;
  top10_concentration_bps: number | string | null;
  graduation_target: number | string | null;
  raised_sol_after: number | string | null;
};

type CurveRow = {
  status: number | string;
  graduation_target: number | string | null;
  tokens_sold_after: number | string | null;
  raised_sol_after: number | string | null;
  price_sol: number | string | null;
};

type TradeRow = {
  trader: string;
  is_buy: boolean;
  sol_amount: string;
  token_amount: string;
  fee: string;
  tokens_sold_after: string;
  raised_sol_after: string;
  tx_signature: string;
  slot: number | string;
  timestamp: Date | string;
};

type TreasuryRow = {
  remaining: number | string;
  remaining_pct: number | string;
  released_total: number | string;
  released_today: number | string;
  released_week: number | string;
};

type PolicyRow = {
  action_index: number | string;
  action_type: string;
  description: string | null;
  amounts: unknown;
  tx_signature: string;
  timestamp: Date | string;
};

type HolderRow = {
  holders_count: number | string;
  top10_concentration_bps: number | string;
  top10_holders: unknown;
};

type LiquidityRow = {
  venue: string;
  lp_depth_usd: number | string | null;
  depth_2pct_usd: number | string | null;
  depth_5pct_usd: number | string | null;
  total_liquidity_sol: number | string | null;
  fees_harvested_sol: number | string | null;
};

type FeesRow = {
  total_trade_fees: number | string | null;
  total_lp_compounded: number | string | null;
  total_house_compounded: number | string | null;
};

type ReleaseRow = {
  amount: number | string | null;
  destination: number | string | null;
  timestamp: Date | string;
};

export interface LaunchPolicyActionsResponse {
  launchId: string;
  actions: PolicyActionLog[];
  total: number;
  limit: number;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toInteger(value: unknown, fallback = 0): number {
  return Math.round(toNumber(value) ?? fallback);
}

function toStringValue(value: unknown, fallback = "0"): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return fallback;
}

function toTimestampMs(value: unknown): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function formatUsdCompact(value: unknown): string | null {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: numeric >= 1000 ? 1 : 2,
  }).format(numeric);
}

function formatSolPrice(value: unknown): string | null {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  return `${numeric.toLocaleString("en-US", { maximumFractionDigits: numeric >= 1 ? 4 : 8 })} SOL`;
}

function statusToLabel(value: unknown): LaunchStatusLabel {
  const status = toInteger(value, 0);
  if (status >= 2) return "FlightMode";
  if (status === 1) return "Stewarding";
  return "CurveActive";
}

function computeProgress(status: LaunchStatusLabel, raised: unknown, target: unknown): number {
  if (status !== "CurveActive") return 100;
  const raisedValue = toNumber(raised) ?? 0;
  const targetValue = toNumber(target) ?? 0;
  if (targetValue <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((raisedValue / targetValue) * 100)));
}

function badgeFor(status: LaunchStatusLabel, progress: number): LaunchBadgeType {
  if (status === "FlightMode") return "flight";
  if (status === "Stewarding") return "graduated";
  if (progress >= 75) return "graduating";
  return null;
}

function computePriceChangePct(current: unknown, previous: unknown): number | null {
  const latest = toNumber(current);
  const prior = toNumber(previous);
  if (latest === null || prior === null || prior === 0) return null;
  return Number((((latest - prior) / prior) * 100).toFixed(2));
}

function mapTreasuryDestination(value: unknown): string {
  const destination = toInteger(value, -1);
  if (destination === 0) return "lp_reserve";
  if (destination === 1) return "distribution";
  return "unknown";
}

function addIntegerStrings(...values: unknown[]): string {
  let total = 0n;
  for (const value of values) {
    try {
      total += BigInt(toStringValue(value));
    } catch {}
  }
  return total.toString();
}

function toAmounts(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const amounts = Object.entries(value as JsonObject).reduce<Record<string, string>>((acc, [key, item]) => {
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      acc[key] = String(item);
    }
    return acc;
  }, {});
  return Object.keys(amounts).length ? amounts : undefined;
}

function toHolderEntries(value: unknown): HolderEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as JsonObject;
    const address = typeof item.address === "string" ? item.address : null;
    if (!address) return [];
    return [{ address, balance: toStringValue(item.balance), percentageBps: toInteger(item.percentageBps) }];
  });
}

function toJsonObject(value: unknown): JsonObject | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonObject) : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : null;
}

export class IndexerReadModel {
  constructor(private pool: Pool | null = getDatabasePool()) {}

  private async query<T>(label: string, sql: string, params: unknown[] = []): Promise<T[] | null> {
    if (!this.pool) return null;
    try {
      const result = await this.pool.query(sql, params);
      return result.rows as T[];
    } catch (err) {
      logger.warn({ err, label }, "ReadModel: query failed");
      return null;
    }
  }

  private async getLaunchCreated(launchId: string): Promise<JsonObject | null> {
    const rows = await this.query<{ decoded_payload: unknown }>("launch-created", "SELECT decoded_payload FROM indexed_events WHERE event_name = 'LaunchCreated' AND decoded_payload->>'launch_id' = $1 ORDER BY received_at DESC LIMIT 1", [launchId]);
    return toJsonObject(rows?.[0]?.decoded_payload ?? null);
  }

  private async getOverviewRows(launchId?: string): Promise<LaunchOverviewRow[] | null> {
    return this.query<LaunchOverviewRow>("launch-overview", `
      SELECT l.launch_id, l.creator, l.mint, l.name, l.symbol, l.uri, l.status, l.created_at, l.graduated_at, l.flight_mode_at,
             mm.price_sol, prev_mm.price_sol AS previous_price_sol, mm.volume_24h_usd, li.lp_depth_usd,
             hs.holders_count, hs.top10_concentration_bps, ci.graduation_target, tr.raised_sol_after
      FROM launches l
      LEFT JOIN LATERAL (SELECT price_sol, volume_24h_usd FROM market_metrics WHERE launch_id = l.launch_id ORDER BY recorded_at DESC LIMIT 1) mm ON TRUE
      LEFT JOIN LATERAL (SELECT price_sol FROM market_metrics WHERE launch_id = l.launch_id AND price_sol IS NOT NULL ORDER BY recorded_at DESC OFFSET 1 LIMIT 1) prev_mm ON TRUE
      LEFT JOIN LATERAL (SELECT lp_depth_usd FROM liquidity_snapshots WHERE launch_id = l.launch_id ORDER BY snapshot_at DESC LIMIT 1) li ON TRUE
      LEFT JOIN LATERAL (SELECT holders_count, top10_concentration_bps FROM holder_snapshots WHERE launch_id = l.launch_id ORDER BY snapshot_at DESC LIMIT 1) hs ON TRUE
      LEFT JOIN LATERAL (SELECT decoded_payload->>'graduation_target' AS graduation_target FROM indexed_events WHERE event_name = 'CurveInitialized' AND decoded_payload->>'launch_id' = l.launch_id ORDER BY received_at DESC LIMIT 1) ci ON TRUE
      LEFT JOIN LATERAL (SELECT raised_sol_after FROM trades WHERE launch_id = l.launch_id ORDER BY timestamp DESC LIMIT 1) tr ON TRUE
      ${launchId ? "WHERE l.launch_id = $1" : ""}
      ORDER BY l.created_at DESC
    `, launchId ? [launchId] : []);
  }

  private mapLaunch(row: LaunchOverviewRow): LaunchListItem {
    const status = statusToLabel(row.status);
    const progress = computeProgress(status, row.raised_sol_after, row.graduation_target);
    return {
      launchId: row.launch_id,
      creator: row.creator,
      mint: row.mint,
      name: row.name,
      symbol: row.symbol,
      uri: row.uri,
      status,
      createdAt: toTimestampMs(row.created_at) ?? Date.now(),
      graduatedAt: toTimestampMs(row.graduated_at),
      flightModeAt: toTimestampMs(row.flight_mode_at),
      marketCapUsd: formatUsdCompact(row.lp_depth_usd),
      volume24hUsd: formatUsdCompact(row.volume_24h_usd),
      lpDepthUsd: formatUsdCompact(row.lp_depth_usd),
      priceUsd: null,
      priceChange24hPct: computePriceChangePct(row.price_sol, row.previous_price_sol),
      holdersCount: toNumber(row.holders_count),
      top10ConcentrationBps: toNumber(row.top10_concentration_bps),
      repliesCount: null,
      badge: badgeFor(status, progress),
    };
  }

  async listLaunches(): Promise<LaunchesResponse | null> {
    const rows = await this.getOverviewRows();
    return rows ? { launches: rows.map((row) => this.mapLaunch(row)), total: rows.length } : null;
  }

  async getLaunch(launchId: string): Promise<LaunchListItem | null> {
    const rows = await this.getOverviewRows(launchId);
    return rows?.[0] ? this.mapLaunch(rows[0]) : null;
  }

  async getCurve(launchId: string): Promise<LaunchCurveResponse | null> {
    const rows = await this.query<CurveRow>("curve", `
      SELECT l.status, ci.graduation_target, tr.tokens_sold_after, tr.raised_sol_after, mm.price_sol
      FROM launches l
      LEFT JOIN LATERAL (SELECT decoded_payload->>'graduation_target' AS graduation_target FROM indexed_events WHERE event_name = 'CurveInitialized' AND decoded_payload->>'launch_id' = l.launch_id ORDER BY received_at DESC LIMIT 1) ci ON TRUE
      LEFT JOIN LATERAL (SELECT tokens_sold_after, raised_sol_after FROM trades WHERE launch_id = l.launch_id ORDER BY timestamp DESC LIMIT 1) tr ON TRUE
      LEFT JOIN LATERAL (SELECT price_sol FROM market_metrics WHERE launch_id = l.launch_id ORDER BY recorded_at DESC LIMIT 1) mm ON TRUE
      WHERE l.launch_id = $1
    `, [launchId]);
    if (!rows?.[0]) return null;
    const status = statusToLabel(rows[0].status);
    return { launchId, tokensSold: toStringValue(rows[0].tokens_sold_after), raisedSol: toStringValue(rows[0].raised_sol_after), graduationProgress: computeProgress(status, rows[0].raised_sol_after, rows[0].graduation_target), currentPrice: formatSolPrice(rows[0].price_sol) ?? "—", isGraduated: status !== "CurveActive" };
  }

  async getTrades(launchId: string, limit: number, offset: number): Promise<LaunchTradesResponse | null> {
    const launch = await this.getLaunch(launchId);
    if (!launch) return null;
    const rows = await this.query<TradeRow>("trades", "SELECT trader, is_buy, sol_amount, token_amount, fee, tokens_sold_after, raised_sol_after, tx_signature, slot, timestamp FROM trades WHERE launch_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3", [launchId, limit, offset]);
    const countRows = await this.query<{ count: string }>("trades-count", "SELECT COUNT(*)::text AS count FROM trades WHERE launch_id = $1", [launchId]);
    if (!rows || !countRows) return null;
    return { launchId, trades: rows.map((row) => ({ trader: row.trader, isBuy: row.is_buy, solAmount: row.sol_amount, tokenAmount: row.token_amount, fee: row.fee, tokensSoldAfter: row.tokens_sold_after, raisedSolAfter: row.raised_sol_after, txSignature: row.tx_signature, slot: toInteger(row.slot), timestamp: toTimestampMs(row.timestamp) ?? Date.now() })), total: toInteger(countRows[0]?.count), limit, offset };
  }

  async getCharter(launchId: string): Promise<LaunchCharterResponse | null> {
    return (await this.getLaunch(launchId)) ? { launchId, charter: DEFAULT_CHARTER } : null;
  }

  async getTreasury(launchId: string): Promise<LaunchTreasuryResponse | null> {
    if (!(await this.getLaunch(launchId))) return null;
    const rows = await this.query<TreasuryRow>("treasury", "SELECT remaining, remaining_pct, released_total, released_today, released_week FROM treasury_snapshots WHERE launch_id = $1 ORDER BY snapshot_at DESC LIMIT 1", [launchId]);
    const releases = (await this.query<ReleaseRow>("treasury-releases", "SELECT amounts->>'amount' AS amount, amounts->>'destination' AS destination, timestamp FROM policy_actions WHERE launch_id = $1 AND action_type = 'TreasuryReleased' ORDER BY timestamp DESC LIMIT 10", [launchId])) ?? [];
    if (!rows?.[0]) {
      const created = await this.getLaunchCreated(launchId);
      const treasurySupply = toStringValue(created?.treasury_supply, "0");
      return { launchId, remaining: treasurySupply, remainingPct: treasurySupply === "0" ? 0 : 100, totalReleased: "0", releasedToday: "0", releasedThisWeek: "0", releaseSchedule: [] };
    }
    return { launchId, remaining: toStringValue(rows[0].remaining), remainingPct: toNumber(rows[0].remaining_pct) ?? 0, totalReleased: toStringValue(rows[0].released_total), releasedToday: toStringValue(rows[0].released_today), releasedThisWeek: toStringValue(rows[0].released_week), releaseSchedule: releases.map((row) => ({ timestamp: toTimestampMs(row.timestamp) ?? Date.now(), amount: toStringValue(row.amount), destination: mapTreasuryDestination(row.destination) })) };
  }

  async getPolicyActions(launchId: string, limit: number): Promise<LaunchPolicyActionsResponse | null> {
    if (!(await this.getLaunch(launchId))) return null;
    const rows = await this.query<PolicyRow>("policy-actions", "SELECT action_index, action_type, description, amounts, tx_signature, timestamp FROM policy_actions WHERE launch_id = $1 ORDER BY action_index DESC LIMIT $2", [launchId, limit]);
    const countRows = await this.query<{ count: string }>("policy-count", "SELECT COUNT(*)::text AS count FROM policy_actions WHERE launch_id = $1", [launchId]);
    if (!rows || !countRows) return null;
    return { launchId, actions: rows.map((row) => ({ index: toInteger(row.action_index), type: row.action_type, description: row.description ?? `${row.action_type} recorded`, timestamp: toTimestampMs(row.timestamp) ?? Date.now(), txSignature: row.tx_signature, amounts: toAmounts(row.amounts) })), total: toInteger(countRows[0]?.count), limit };
  }

  async getHolders(launchId: string): Promise<LaunchHolderStatsResponse | null> {
    const launch = await this.getLaunch(launchId);
    if (!launch) return null;
    const rows = await this.query<HolderRow>("holders", "SELECT holders_count, top10_concentration_bps, top10_holders FROM holder_snapshots WHERE launch_id = $1 ORDER BY snapshot_at DESC LIMIT 1", [launchId]);
    return { launchId, holdersCount: toInteger(rows?.[0]?.holders_count, launch.holdersCount ?? 0), top10ConcentrationBps: toInteger(rows?.[0]?.top10_concentration_bps, launch.top10ConcentrationBps ?? 0), top10Holders: toHolderEntries(rows?.[0]?.top10_holders) };
  }

  async getLiquidity(launchId: string): Promise<LaunchLiquidityStatsResponse | null> {
    if (!(await this.getLaunch(launchId))) return null;
    const rows = await this.query<LiquidityRow>("liquidity", "SELECT venue, lp_depth_usd, depth_2pct_usd, depth_5pct_usd, total_liquidity_sol, fees_harvested_sol FROM liquidity_snapshots WHERE launch_id = $1 ORDER BY snapshot_at DESC LIMIT 1", [launchId]);
    const feeRows = await this.query<FeesRow>("liquidity-agg", `SELECT COALESCE((SELECT SUM(fee) FROM trades WHERE launch_id = $1), 0)::text AS total_trade_fees, COALESCE((SELECT SUM(COALESCE(NULLIF(amounts->>'lp_amount', '')::numeric, 0) + COALESCE(NULLIF(amounts->>'compound_lp_amount', '')::numeric, 0)) FROM policy_actions WHERE launch_id = $1), 0)::text AS total_lp_compounded, COALESCE((SELECT SUM(COALESCE(NULLIF(amounts->>'house_amount', '')::numeric, 0) + COALESCE(NULLIF(amounts->>'compound_house_amount', '')::numeric, 0)) FROM policy_actions WHERE launch_id = $1), 0)::text AS total_house_compounded`, [launchId]);
    return { launchId, venue: rows?.[0]?.venue ?? "Meteora DLMM", lpDepthUsd: formatUsdCompact(rows?.[0]?.lp_depth_usd) ?? "$—", depth2Pct: formatUsdCompact(rows?.[0]?.depth_2pct_usd) ?? "$—", depth5Pct: formatUsdCompact(rows?.[0]?.depth_5pct_usd) ?? "$—", totalLiquidityAddedSol: toStringValue(rows?.[0]?.total_liquidity_sol), totalFeesHarvested: toStringValue(rows?.[0]?.fees_harvested_sol ?? feeRows?.[0]?.total_trade_fees), totalCompounded: toStringValue(feeRows?.[0]?.total_lp_compounded) };
  }

  async getFlightStatus(launchId: string): Promise<LaunchFlightStatusResponse | null> {
    const launch = await this.getLaunch(launchId);
    const holders = await this.getHolders(launchId);
    const treasury = await this.getTreasury(launchId);
    if (!launch || !holders || !treasury) return null;
    const daysSinceGraduation = launch.graduatedAt ? Math.max(0, Math.floor((Date.now() - launch.graduatedAt) / DAY_MS)) : 0;
    const treasuryRemainingBps = Math.round((treasury.remainingPct ?? 0) * 100);
    const holdersOk = holders.holdersCount >= DEFAULT_CHARTER.flightHoldersThreshold;
    const concentrationOk = holders.top10ConcentrationBps <= DEFAULT_CHARTER.flightTop10ConcentrationBps;
    const treasuryOk = treasuryRemainingBps <= DEFAULT_CHARTER.flightTreasuryRemainingBps;
    const forcedSunset = daysSinceGraduation >= 180;
    return { launchId, isFlightMode: launch.status === "FlightMode", eligible: (holdersOk && concentrationOk && treasuryOk) || forcedSunset, conditions: { holdersCount: holders.holdersCount, holdersTarget: DEFAULT_CHARTER.flightHoldersThreshold, holdersOk, top10ConcentrationBps: holders.top10ConcentrationBps, top10Target: DEFAULT_CHARTER.flightTop10ConcentrationBps, concentrationOk, treasuryRemainingBps, treasuryTarget: DEFAULT_CHARTER.flightTreasuryRemainingBps, treasuryOk, daysSinceGraduation, maxDays: 180, forcedSunset } };
  }

  async getFees(launchId: string): Promise<LaunchFeeBreakdownResponse | null> {
    if (!(await this.getLaunch(launchId))) return null;
    const rows = await this.query<FeesRow>("fees", `SELECT COALESCE((SELECT SUM(fee) FROM trades WHERE launch_id = $1), 0)::text AS total_trade_fees, COALESCE((SELECT SUM(COALESCE(NULLIF(amounts->>'lp_amount', '')::numeric, 0) + COALESCE(NULLIF(amounts->>'compound_lp_amount', '')::numeric, 0)) FROM policy_actions WHERE launch_id = $1), 0)::text AS total_lp_compounded, COALESCE((SELECT SUM(COALESCE(NULLIF(amounts->>'house_amount', '')::numeric, 0) + COALESCE(NULLIF(amounts->>'compound_house_amount', '')::numeric, 0)) FROM policy_actions WHERE launch_id = $1), 0)::text AS total_house_compounded`, [launchId]);
    if (!rows?.[0]) return null;
    return { launchId, totalFeesCollected: addIntegerStrings(rows[0].total_trade_fees, rows[0].total_lp_compounded, rows[0].total_house_compounded), lpFeesCompounded: toStringValue(rows[0].total_lp_compounded), houseFeesCollected: toStringValue(rows[0].total_house_compounded), feeSplitLp: 99, feeSplitHouse: 1 };
  }

  async getDashboard(launchId: string): Promise<LaunchDashboardResponse | null> {
    const [launch, curve, treasury, holders, liquidity, flight, fees, actions] = await Promise.all([this.getLaunch(launchId), this.getCurve(launchId), this.getTreasury(launchId), this.getHolders(launchId), this.getLiquidity(launchId), this.getFlightStatus(launchId), this.getFees(launchId), this.getPolicyActions(launchId, 10)]);
    if (!launch || !flight) return null;
    return { launchId, name: launch.name, symbol: launch.symbol, mint: launch.mint, status: launch.status, curve: curve ?? { launchId, tokensSold: "0", raisedSol: "0", graduationProgress: launch.status === "CurveActive" ? 0 : 100, currentPrice: "—", isGraduated: launch.status !== "CurveActive" }, stewardship: { treasuryRemaining: treasury?.remaining ?? "0", treasuryRemainingPct: treasury?.remainingPct ?? 0, lpDepthUsd: liquidity?.lpDepthUsd ?? "$—", holdersCount: holders?.holdersCount ?? 0, top10ConcentrationBps: holders?.top10ConcentrationBps ?? 0, dayNumber: flight.conditions.daysSinceGraduation }, flight, fees: fees ?? { launchId, totalFeesCollected: "0", lpFeesCompounded: "0", houseFeesCollected: "0", feeSplitLp: 99, feeSplitHouse: 1 }, recentActions: actions?.actions ?? [] };
  }
}
