export type LaunchStatusLabel = "CurveActive" | "Stewarding" | "FlightMode";
export type LaunchBadgeType = "graduated" | "graduating" | "flight" | null;

export interface PolicyActionLog {
  index: number;
  type: string;
  description: string;
  timestamp: number;
  txSignature: string;
  amounts?: { [key: string]: string };
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

export interface HolderEntry {
  address: string;
  balance: string;
  percentageBps: number;
}

export interface LaunchListItem {
  launchId: string;
  creator: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string | null;
  status: LaunchStatusLabel;
  createdAt: number;
  graduatedAt?: number | null;
  flightModeAt?: number | null;
  marketCapUsd?: string | null;
  volume24hUsd?: string | null;
  lpDepthUsd?: string | null;
  priceUsd?: string | null;
  priceChange24hPct?: number | null;
  holdersCount?: number | null;
  top10ConcentrationBps?: number | null;
  repliesCount?: number | null;
  badge?: LaunchBadgeType;
}

export interface LaunchesResponse {
  launches: LaunchListItem[];
  total: number;
}

export interface LaunchCurveResponse {
  launchId: string;
  tokensSold: string;
  raisedSol: string;
  graduationProgress: number;
  currentPrice: string;
  isGraduated: boolean;
}

export interface LaunchTradeItem {
  trader: string;
  isBuy: boolean;
  solAmount: string;
  tokenAmount: string;
  fee: string;
  tokensSoldAfter: string;
  raisedSolAfter: string;
  txSignature: string;
  slot: number;
  timestamp: number;
}

export interface LaunchTradesResponse {
  launchId: string;
  trades: LaunchTradeItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CharterSnapshot {
  dailyReleaseRateBps: number;
  maxDailyRelease: string;
  maxWeeklyRelease: string;
  sellPressureCapEarlyBps: number;
  sellPressureCapMatureBps: number;
  flightHoldersThreshold: number;
  flightTop10ConcentrationBps: number;
  flightTreasuryRemainingBps: number;
  maxStewardshipDuration: number;
  houseFeeEndsAtFlight: boolean;
  feeSplitLpBps: number;
  feeSplitHouseBps: number;
  feeSplitReferralBps: number;
}

export interface LaunchCharterResponse {
  launchId: string;
  charter: CharterSnapshot;
}

export interface LaunchTreasuryResponse {
  launchId: string;
  remaining: string;
  remainingPct: number;
  totalReleased: string;
  releasedToday: string;
  releasedThisWeek: string;
  releaseSchedule: Array<{
    timestamp: number;
    amount: string;
    destination: string;
  }>;
}

export interface LaunchHolderStatsResponse {
  launchId: string;
  holdersCount: number;
  top10ConcentrationBps: number;
  top10Holders: HolderEntry[];
}

export interface LaunchLiquidityStatsResponse {
  launchId: string;
  venue: string;
  lpDepthUsd: string;
  depth2Pct: string;
  depth5Pct: string;
  totalLiquidityAddedSol: string;
  totalFeesHarvested: string;
  totalCompounded: string;
}

export interface LaunchFlightConditions {
  holdersCount: number;
  holdersTarget: number;
  holdersOk: boolean;
  top10ConcentrationBps: number;
  top10Target: number;
  concentrationOk: boolean;
  treasuryRemainingBps: number;
  treasuryTarget: number;
  treasuryOk: boolean;
  daysSinceGraduation: number;
  maxDays: number;
  forcedSunset: boolean;
}

export interface LaunchFlightStatusResponse {
  launchId: string;
  isFlightMode: boolean;
  eligible: boolean;
  conditions: LaunchFlightConditions;
}

export interface LaunchFeeBreakdownResponse {
  launchId: string;
  totalFeesCollected: string;
  lpFeesCompounded: string;
  houseFeesCollected: string;
  feeSplitLp: number;
  feeSplitHouse: number;
}

export interface LaunchDashboardResponse {
  launchId: string;
  name: string;
  symbol: string;
  mint: string;
  status: LaunchStatusLabel;
  curve: LaunchCurveResponse;
  stewardship: {
    treasuryRemaining: string;
    treasuryRemainingPct: number;
    lpDepthUsd: string;
    holdersCount: number;
    top10ConcentrationBps: number;
    dayNumber: number;
  };
  flight: LaunchFlightStatusResponse;
  fees: LaunchFeeBreakdownResponse;
  recentActions: PolicyActionLog[];
}

export interface TransparencyReport {
  launchId: string;
  reportType: "daily" | "weekly";
  generatedAt: number;
  modelId: string;
  promptHash: string;
  disclaimer: string;
  summary: {
    status: string;
    dayNumber: number;
    holdersCount: number;
    priceChange24h: string;
    volume24h: string;
  };
  treasury: {
    remaining: string;
    remainingPct: number;
    releasedToday: string;
    releaseSchedule: string;
  };
  liquidity: {
    lpDepthUsd: string;
    feesHarvested: string;
    compounded: string;
    houseShare: string;
  };
  distribution: {
    top10Concentration: string;
    holdersGrowth: string;
    newHolders24h: number;
  };
  flightMode: {
    eligible: boolean;
    holdersProgress: number;
    concentrationProgress: number;
    treasuryProgress: number;
    daysRemaining: number;
  };
  policyActions: PolicyActionLog[];
  anomalies: Array<Record<string, unknown>>;
}

export interface QueryResponse {
  launchId: string;
  question: string;
  answer: string;
  queryType: string;
  modelId: string;
  promptHash: string;
  timestamp: number;
  disclaimer: string;
}

// ── Referral System ────────────────────────────────────────────────────────

export interface ReferralCodeResponse {
  wallet: string;
  code: string;
  created_at: string;
}

export interface ReferralResolveResponse {
  code: string;
  referrer_wallet: string;
}

export interface ReferralAttributionResponse {
  status: "attributed" | "already_attributed";
  referee_wallet: string;
  referrer_wallet?: string;
  second_degree_referrer?: string | null;
}

export interface ReferralStatsResponse {
  wallet: string;
  code: string;
  referral_link: string;
  total_referrals: number;
  active_referees: number;
  total_earned_lamports: string;
  earned_24h_lamports: string;
  earned_7d_lamports: string;
  total_paid_lamports: string;
  pending_balance_lamports: string;
  total_trades_referred: number;
}

export interface ReferralEarningEntry {
  referee_wallet: string;
  launch_id: string;
  trade_tx: string;
  tier: 1 | 2;
  fee_lamports: string;
  earned_lamports: string;
  created_at: string;
}

export interface ReferralEarningsResponse {
  wallet: string;
  earnings: ReferralEarningEntry[];
  totals: {
    total_earned_lamports: string;
    total_trades: number;
    unique_referees: number;
  };
}

export interface RecordTradeEarningRequest {
  trader: string;
  launch_id: string;
  trade_tx: string;
  fee_lamports: string;
  referral_pool_lamports: string;
}

export interface RecordTradeEarningResponse {
  status: "recorded" | "no_referrer" | "already_recorded" | "skipped";
  tier1_referrer?: string;
  tier1_earned?: string;
  tier2_earned?: string;
  airdrop_pool?: string;
  reason?: string;
}
