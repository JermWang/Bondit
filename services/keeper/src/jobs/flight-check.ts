import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { logger } from "../logger";
import { getActiveStewardingLaunches, getLatestStewardshipMetrics, rowToPublicKeys, recordPolicyAction } from "../db";

/**
 * Flight Mode Check Job
 * 
 * Runs every 6 hours to evaluate whether flight mode conditions are met:
 * 1. HOLDERS_COUNT >= 15,000
 * 2. TOP10_CONCENTRATION <= 18%
 * 3. TREASURY_REMAINING <= 5% total supply
 * OR: 180 days have elapsed (forced sunset)
 */
export class FlightCheckJob {
  private readonly FLIGHT_HOLDERS = 15_000;
  private readonly FLIGHT_TOP10_BPS = 1800; // 18%
  private readonly FLIGHT_TREASURY_BPS = 500; // 5%
  private readonly MAX_STEWARDSHIP_DAYS = 180;
  private readonly TOTAL_SUPPLY_UNITS = new BN(1_000_000_000).mul(new BN(1_000_000));

  constructor(
    private connection: Connection,
    private keeper: Keypair,
  ) {}

  async run(): Promise<void> {
    logger.info("FlightCheckJob: evaluating active launches...");

    const activeLaunches = await this.getActiveLaunches();

    for (const launch of activeLaunches) {
      try {
        await this.checkFlight(launch);
      } catch (err) {
        logger.error({ err, launch: launch.launchId }, "FlightCheckJob: failed");
      }
    }
  }

  private async checkFlight(launch: ActiveLaunch): Promise<void> {
    // 1. Get current metrics from PolicyState
    const holdersCount = launch.holdersCount;
    const top10Bps = launch.top10ConcentrationBps;
    const treasuryBps = Math.round(launch.treasuryRemainingPct * 100);

    // 3. Check elapsed days
    const now = Math.floor(Date.now() / 1000);
    const daysSince = Math.floor((now - launch.graduationTimestamp) / 86400);

    // 4. Evaluate conditions
    const holdersOk = holdersCount >= this.FLIGHT_HOLDERS;
    const concentrationOk = top10Bps <= this.FLIGHT_TOP10_BPS;
    const treasuryOk = treasuryBps <= this.FLIGHT_TREASURY_BPS;
    const forcedSunset = daysSince >= this.MAX_STEWARDSHIP_DAYS;

    const eligible = (holdersOk && concentrationOk && treasuryOk) || forcedSunset;

    logger.info({
      launchId: launch.launchId,
      holdersCount,
      holdersOk,
      top10Bps,
      concentrationOk,
      treasuryBps,
      treasuryOk,
      daysSince,
      forcedSunset,
      eligible,
    }, "FlightCheckJob: evaluation");

    if (eligible) {
      logger.info({ launchId: launch.launchId }, "FlightCheckJob: FLIGHT MODE ELIGIBLE — triggering...");
      // In production: submit trigger_flight_mode transaction
      // const sig = await this.triggerFlightMode(launch);

      await recordPolicyAction(
        launch.launchId,
        "flight_mode_triggered",
        0,
        forcedSunset
          ? `Forced sunset after ${daysSince} days`
          : `Organic: ${holdersCount} holders, ${top10Bps}bps top10, ${treasuryBps}bps treasury`,
        "pending",
        0,
        { holdersCount: String(holdersCount), top10Bps: String(top10Bps), treasuryBps: String(treasuryBps), daysSince: String(daysSince) },
      );
    }
  }

  private async getActiveLaunches(): Promise<ActiveLaunch[]> {
    const rows = await getActiveStewardingLaunches();
    const launches = await Promise.all(
      rows
        .filter((r) => r.vault_state && r.policy_state && r.graduated_at)
        .map(async (r) => {
          const keys = rowToPublicKeys(r);
          const metrics = await getLatestStewardshipMetrics(r.launch_id);
          if (!metrics) {
            logger.warn({ launchId: r.launch_id }, "FlightCheckJob: missing stewardship metrics snapshot");
            return null;
          }

          return {
            launchId: r.launch_id,
            mint: keys.mint,
            policyState: keys.policyState!,
            vaultState: keys.vaultState!,
            holdersCount: metrics.holders_count,
            top10ConcentrationBps: metrics.top10_concentration_bps,
            treasuryRemainingPct: metrics.treasury_remaining_pct,
            graduationTimestamp: keys.graduatedAt ? Math.floor(keys.graduatedAt.getTime() / 1000) : 0,
          };
        }),
    );

    return launches.flatMap((launch) => (launch ? [launch] : []));
  }
}

interface ActiveLaunch {
  launchId: string;
  mint: PublicKey;
  policyState: PublicKey;
  vaultState: PublicKey;
  holdersCount: number;
  top10ConcentrationBps: number;
  treasuryRemainingPct: number;
  graduationTimestamp: number;
}
