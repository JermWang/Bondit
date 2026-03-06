import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ── Enums ─────────────────────────────────────────────────────────────────

export enum LaunchMode {
  Native = 0,
  PumpRoute = 1,
}

export enum LaunchStatus {
  CurveActive = 0,
  Stewarding = 1,
  FlightMode = 2,
}

export enum PolicyEngineState {
  Pending = 0,
  Active = 1,
  Locked = 2,
}

export enum VenueType {
  MeteoraDlmm = 0,
  RaydiumClmm = 1,
}

export enum LiquidityStrategy {
  Curve = 0,
  Flat = 1,
  BidAsk = 2,
}

export enum ReleaseDestination {
  LpReserve = 0,
  Distribution = 1,
}

// ── Account State Types ───────────────────────────────────────────────────

export interface LaunchState {
  launchId: number[];
  creator: PublicKey;
  mint: PublicKey;
  launchMode: LaunchMode;
  curveState: PublicKey;
  vaultState: PublicKey;
  policyState: PublicKey;
  adapterState: PublicKey;
  curveTokenVault: PublicKey;
  treasuryVault: PublicKey;
  lpReserveVault: PublicKey;
  status: LaunchStatus;
  createdAt: BN;
  graduatedAt: BN;
  flightModeAt: BN;
  name: string;
  symbol: string;
  uri: string;
  bump: number;
  mintBump: number;
}

export interface CurveState {
  launchId: number[];
  mint: PublicKey;
  authority: PublicKey;
  curveVault: PublicKey;
  solVault: PublicKey;
  feeAccumulator: PublicKey;
  houseVault: PublicKey;
  totalSupplyOnCurve: BN;
  tokensSold: BN;
  raisedSol: BN;
  isGraduated: boolean;
  graduationTimestamp: BN;
  totalTrades: BN;
  totalFeesCollected: BN;
  bump: number;
  solVaultBump: number;
  createdAt: BN;
}

export interface Charter {
  dailyReleaseRateBps: number;
  maxDailyReleaseUnits: BN;
  maxWeeklyReleaseUnits: BN;
  sellPressureCapEarlyBps: number;
  sellPressureCapMatureBps: number;
  flightHoldersThreshold: number;
  flightTop10ConcentrationBps: number;
  flightTreasuryRemainingBps: number;
  maxStewardshipDuration: BN;
  houseFeeEndsAtFlight: boolean;
  feeSplitLpBps: number;
  feeSplitHouseBps: number;
}

export interface VaultState {
  launchId: number[];
  mint: PublicKey;
  authority: PublicKey;
  policyEngine: PublicKey;
  treasuryVault: PublicKey;
  lpReserveVault: PublicKey;
  feeAccumulatorSol: PublicKey;
  houseVaultSol: PublicKey;
  charter: Charter;
  treasuryReleasedTotal: BN;
  treasuryReleasedToday: BN;
  treasuryReleasedThisWeek: BN;
  lastReleaseDay: BN;
  lastReleaseWeek: BN;
  lpFeesCompounded: BN;
  houseFeesCollected: BN;
  policyActionsCount: BN;
  isFlightMode: boolean;
  flightModeTimestamp: BN;
  isPaused: boolean;
  createdAt: BN;
  bump: number;
}

export interface PolicyState {
  launchId: number[];
  authority: PublicKey;
  vaultState: PublicKey;
  keeper: PublicKey;
  state: PolicyEngineState;
  graduationTimestamp: BN;
  lastMonitorTimestamp: BN;
  lastExecutionTimestamp: BN;
  lastRebalanceTimestamp: BN;
  holdersCount: number;
  top10ConcentrationBps: number;
  lpDepthUsd: BN;
  currentDayNumber: number;
  totalReleases: BN;
  totalCompounds: BN;
  totalRebalances: BN;
  totalMonitorRuns: BN;
  anomalyFlags: BN;
  bump: number;
  createdAt: BN;
}

export interface AdapterState {
  launchId: number[];
  policyEngine: PublicKey;
  keeper: PublicKey;
  primaryVenue: VenueType;
  poolAddress: PublicKey;
  positionAddress: PublicKey;
  isPoolCreated: boolean;
  isPositionActive: boolean;
  totalLiquidityAddedSol: BN;
  totalLiquidityAddedTokens: BN;
  totalFeesHarvestedSol: BN;
  totalFeesHarvestedTokens: BN;
  totalRebalances: BN;
  lastActionTimestamp: BN;
  bump: number;
  createdAt: BN;
}

// ── Event Types ───────────────────────────────────────────────────────────

export interface TradeEvent {
  launchId: number[];
  trader: PublicKey;
  isBuy: boolean;
  solAmount: BN;
  tokenAmount: BN;
  fee: BN;
  tokensSoldAfter: BN;
  raisedSolAfter: BN;
}

export interface GraduationEvent {
  launchId: number[];
  mint: PublicKey;
  raisedSol: BN;
  tokensSold: BN;
  timestamp: BN;
}

export interface FlightModeEvent {
  launchId: number[];
  organicReady: boolean;
  maxDurationExceeded: boolean;
  holdersCount: number;
  top10ConcentrationBps: number;
  treasuryRemaining: BN;
  timestamp: BN;
}

// ── Dashboard / API Types ─────────────────────────────────────────────────

export interface LaunchDashboard {
  launchId: string;
  name: string;
  symbol: string;
  mint: string;
  status: LaunchStatus;
  createdAt: number;

  // Curve phase
  tokensSold: string;
  raisedSol: string;
  graduationProgress: number; // 0-100%
  currentPrice: string;

  // Stewardship phase
  treasuryRemaining: string;
  treasuryRemainingPct: number;
  lpDepthUsd: string;
  holdersCount: number;
  top10Concentration: number;
  dayNumber: number;

  // Flight mode
  flightEligible: boolean;
  flightCountdown: FlightCountdown;

  // Fees
  totalFeesCollected: string;
  lpFeesCompounded: string;
  houseFeesCollected: string;

  // Policy actions
  policyActionsCount: number;
  lastPolicyAction: string;
}

export interface FlightCountdown {
  holdersProgress: number; // current / 15000
  concentrationProgress: number; // (100 - current) / (100 - 18)
  treasuryProgress: number; // (100 - remaining%) / (100 - 5)
  daysRemaining: number; // 180 - dayNumber
}
