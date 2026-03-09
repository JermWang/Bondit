import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ── Program IDs ───────────────────────────────────────────────────────────
// Reads from environment variables when available. Falls back to the System
// Program (11111…) so that importing the SDK never crashes at load time,
// even before real programs are deployed on-chain.
const PLACEHOLDER = "11111111111111111111111111111111";
function programId(envKey: string): PublicKey {
  return new PublicKey(process.env[envKey] || PLACEHOLDER);
}

export const LAUNCH_FACTORY_PROGRAM_ID = programId("LAUNCH_FACTORY_PROGRAM_ID");
export const BONDING_CURVE_PROGRAM_ID = programId("BONDING_CURVE_PROGRAM_ID");
export const AGENCY_VAULTS_PROGRAM_ID = programId("AGENCY_VAULTS_PROGRAM_ID");
export const POLICY_ENGINE_PROGRAM_ID = programId("POLICY_ENGINE_PROGRAM_ID");
export const VENUE_ADAPTERS_PROGRAM_ID = programId("VENUE_ADAPTERS_PROGRAM_ID");

// ── Supply Constants ──────────────────────────────────────────────────────
export const TOKEN_DECIMALS = 6;
export const DECIMAL_MULTIPLIER = new BN(10).pow(new BN(TOKEN_DECIMALS));

export const TOTAL_SUPPLY = new BN(1_000_000_000).mul(DECIMAL_MULTIPLIER);
export const CURVE_SUPPLY = new BN(700_000_000).mul(DECIMAL_MULTIPLIER);
export const LP_RESERVE = new BN(150_000_000).mul(DECIMAL_MULTIPLIER);
export const AGENCY_TREASURY = new BN(100_000_000).mul(DECIMAL_MULTIPLIER);
export const ECOSYSTEM_FUND = new BN(50_000_000).mul(DECIMAL_MULTIPLIER);

// ── Curve Constants ───────────────────────────────────────────────────────
export const GRADUATION_SOL_TARGET = new BN(85_000_000_000); // 85 SOL in lamports
export const CURVE_PROTOCOL_FEE_BPS = 200; // 2%
export const FEE_SPLIT_LP_BPS = 7000; // 70%
export const FEE_SPLIT_HOUSE_BPS = 2000; // 20%
export const FEE_SPLIT_REFERRAL_BPS = 1000; // 10%
export const VIRTUAL_SOL_RESERVES = new BN(30_000_000_000); // 30 SOL virtual
export const VIRTUAL_TOKEN_RESERVES = CURVE_SUPPLY;

// ── Stewardship Constants ─────────────────────────────────────────────────
export const MONITOR_CADENCE_SECONDS = 3600; // 1 hour
export const EXECUTION_CADENCE_SECONDS = 86400; // 1 day
export const DAILY_RELEASE_RATE_BPS = 20; // 0.20%
export const MAX_DAILY_RELEASE = new BN(1_000_000).mul(DECIMAL_MULTIPLIER);
export const MAX_WEEKLY_RELEASE = new BN(5_000_000).mul(DECIMAL_MULTIPLIER);
export const SELL_PRESSURE_CAP_DAY1_7_BPS = 400; // 4%
export const SELL_PRESSURE_CAP_DAY30_PLUS_BPS = 100; // 1%

// ── Flight Mode Constants ─────────────────────────────────────────────────
export const FLIGHT_HOLDERS_THRESHOLD = 15_000;
export const FLIGHT_TOP10_CONCENTRATION_BPS = 1800; // 18%
export const FLIGHT_TREASURY_REMAINING_BPS = 500; // 5%
export const MAX_STEWARDSHIP_DURATION_DAYS = 180;
export const MAX_STEWARDSHIP_DURATION_SECONDS = MAX_STEWARDSHIP_DURATION_DAYS * 86400;

// ── PDA Seeds ─────────────────────────────────────────────────────────────
export const SEEDS = {
  LAUNCH_STATE: Buffer.from("launch_state"),
  TOKEN_MINT: Buffer.from("token_mint"),
  CURVE_STATE: Buffer.from("curve_state"),
  SOL_VAULT: Buffer.from("sol_vault"),
  VAULT_STATE: Buffer.from("vault_state"),
  POLICY_STATE: Buffer.from("policy_state"),
  ADAPTER_STATE: Buffer.from("adapter_state"),
} as const;
