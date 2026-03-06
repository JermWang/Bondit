import BN from "bn.js";
import {
  VIRTUAL_SOL_RESERVES,
  VIRTUAL_TOKEN_RESERVES,
  CURVE_PROTOCOL_FEE_BPS,
  GRADUATION_SOL_TARGET,
} from "./constants";

/**
 * Calculate tokens out for a given SOL buy amount on the bonding curve.
 * Uses constant-product formula: x * y = k with virtual reserves.
 */
export function calculateBuyTokensOut(
  solAmount: BN,
  currentRaisedSol: BN,
  currentTokensSold: BN
): { tokensOut: BN; fee: BN; newPrice: BN } {
  const fee = solAmount.mul(new BN(CURVE_PROTOCOL_FEE_BPS)).div(new BN(10_000));
  const solAfterFee = solAmount.sub(fee);

  const virtualSol = VIRTUAL_SOL_RESERVES.add(currentRaisedSol);
  const virtualTokens = VIRTUAL_TOKEN_RESERVES.sub(currentTokensSold);

  // k = virtualSol * virtualTokens
  const k = virtualSol.mul(virtualTokens);
  const newVirtualSol = virtualSol.add(solAfterFee);
  const newVirtualTokens = k.div(newVirtualSol);
  const tokensOut = virtualTokens.sub(newVirtualTokens);

  // Price = virtualSol / virtualTokens (in lamports per token unit)
  const newPrice = newVirtualSol.mul(new BN(1_000_000)).div(newVirtualTokens.isZero() ? new BN(1) : newVirtualTokens);

  return { tokensOut, fee, newPrice };
}

/**
 * Calculate SOL out for a given token sell amount on the bonding curve.
 */
export function calculateSellSolOut(
  tokenAmount: BN,
  currentRaisedSol: BN,
  currentTokensSold: BN
): { solOut: BN; fee: BN; newPrice: BN } {
  const virtualSol = VIRTUAL_SOL_RESERVES.add(currentRaisedSol);
  const virtualTokens = VIRTUAL_TOKEN_RESERVES.sub(currentTokensSold);

  const k = virtualSol.mul(virtualTokens);
  const newVirtualTokens = virtualTokens.add(tokenAmount);
  const newVirtualSol = k.div(newVirtualTokens);
  const grossSolOut = virtualSol.sub(newVirtualSol);

  const fee = grossSolOut.mul(new BN(CURVE_PROTOCOL_FEE_BPS)).div(new BN(10_000));
  const solOut = grossSolOut.sub(fee);

  const newPrice = newVirtualSol.mul(new BN(1_000_000)).div(newVirtualTokens.isZero() ? new BN(1) : newVirtualTokens);

  return { solOut, fee, newPrice };
}

/**
 * Get current token price in lamports per token (with 6 decimal precision).
 */
export function getCurrentPrice(
  currentRaisedSol: BN,
  currentTokensSold: BN
): BN {
  const virtualSol = VIRTUAL_SOL_RESERVES.add(currentRaisedSol);
  const virtualTokens = VIRTUAL_TOKEN_RESERVES.sub(currentTokensSold);
  if (virtualTokens.isZero()) return new BN(0);
  return virtualSol.mul(new BN(1_000_000)).div(virtualTokens);
}

/**
 * Calculate graduation progress (0-100).
 */
export function graduationProgress(currentRaisedSol: BN): number {
  if (currentRaisedSol.gte(GRADUATION_SOL_TARGET)) return 100;
  return currentRaisedSol.mul(new BN(100)).div(GRADUATION_SOL_TARGET).toNumber();
}

/**
 * Calculate treasury release for today using exponential decay.
 * release = treasuryRemaining * 0.002 (0.20%)
 */
export function calculateDailyTreasuryRelease(treasuryRemaining: BN): BN {
  return treasuryRemaining.mul(new BN(20)).div(new BN(10_000));
}

/**
 * Compute sell pressure cap based on day number.
 * Days 1-7: 4% of LP depth
 * Days 8-29: linear taper from 4% to 1%
 * Day 30+: 1% of LP depth
 */
export function computeSellPressureCap(dayNumber: number, lpDepthUsd: BN): BN {
  let capBps: number;
  if (dayNumber <= 7) {
    capBps = 400;
  } else if (dayNumber >= 30) {
    capBps = 100;
  } else {
    const range = 30 - 7;
    const elapsed = dayNumber - 7;
    const reduction = Math.floor((300 * elapsed) / range);
    capBps = 400 - reduction;
  }
  return lpDepthUsd.mul(new BN(capBps)).div(new BN(10_000));
}

/**
 * Check if flight mode conditions are met.
 */
export function checkFlightConditions(
  holdersCount: number,
  top10ConcentrationBps: number,
  treasuryRemainingBps: number,
  daysSinceGraduation: number
): {
  eligible: boolean;
  holdersOk: boolean;
  concentrationOk: boolean;
  treasuryOk: boolean;
  forcedSunset: boolean;
} {
  const holdersOk = holdersCount >= 15_000;
  const concentrationOk = top10ConcentrationBps <= 1800;
  const treasuryOk = treasuryRemainingBps <= 500;
  const forcedSunset = daysSinceGraduation >= 180;
  const eligible = (holdersOk && concentrationOk && treasuryOk) || forcedSunset;

  return { eligible, holdersOk, concentrationOk, treasuryOk, forcedSunset };
}
