import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ── Program IDs ───────────────────────────────────────────────────────────
export const LAUNCH_FACTORY_PROGRAM_ID = new PublicKey("LFac1111111111111111111111111111111111111111");
export const BONDING_CURVE_PROGRAM_ID = new PublicKey("BCrv1111111111111111111111111111111111111111");
export const AGENCY_VAULTS_PROGRAM_ID = new PublicKey("AVlt1111111111111111111111111111111111111111");
export const POLICY_ENGINE_PROGRAM_ID = new PublicKey("PEng1111111111111111111111111111111111111111");
export const VENUE_ADAPTERS_PROGRAM_ID = new PublicKey("VAdp1111111111111111111111111111111111111111");

// ── Supply Constants ──────────────────────────────────────────────────────
export const TOKEN_DECIMALS = 6;
export const DECIMAL_MULTIPLIER = new BN(10).pow(new BN(TOKEN_DECIMALS));

export const TOTAL_SUPPLY = new BN(1_000_000_000).mul(DECIMAL_MULTIPLIER);
export const CURVE_SUPPLY = new BN(800_000_000).mul(DECIMAL_MULTIPLIER);
export const AGENCY_TREASURY = new BN(150_000_000).mul(DECIMAL_MULTIPLIER);
export const LP_RESERVE = new BN(50_000_000).mul(DECIMAL_MULTIPLIER);

// ── Curve Constants ───────────────────────────────────────────────────────
export const GRADUATION_SOL_TARGET = new BN(85_000_000_000); // 85 SOL in lamports
export const CURVE_PROTOCOL_FEE_BPS = 100; // 1%
export const FEE_SPLIT_LP_BPS = 9900; // 99%
export const FEE_SPLIT_HOUSE_BPS = 100; // 1%
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
