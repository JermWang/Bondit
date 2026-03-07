import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { logger } from "../logger";
import { getActiveStewardingLaunches, rowToPublicKeys } from "../db";

type HarvestResult = {
  available: boolean;
  sol: BN;
  tokens: BN;
};

/**
 * Daily Compound Job
 * 
 * Responsibilities:
 * 1. Harvest LP fees from venue positions
 * 2. Split 99% to LP re-add (compound) and 1% to House
 * 3. Re-deposit compounded amount into LP position
 * 4. Record compound action in AgencyVaults
 */
export class CompoundJob {
  constructor(
    private connection: Connection,
    private keeper: Keypair,
  ) {}

  async run(): Promise<void> {
    logger.info("CompoundJob: starting daily compound...");

    const activeLaunches = await this.getActiveLaunches();

    for (const launch of activeLaunches) {
      try {
        await this.compoundLaunch(launch);
      } catch (err) {
        logger.error({ err, launch: launch.launchId }, "CompoundJob: failed for launch");
      }
    }
  }

  private async compoundLaunch(launch: ActiveLaunch): Promise<void> {
    // 1. Harvest fees from LP position via VenueAdapter
    const harvestedFees = await this.harvestFees(launch);

    if (!harvestedFees.available) {
      logger.warn({ launchId: launch.launchId }, "CompoundJob: venue fee harvest is not wired yet; skipping compound execution");
      return;
    }

    if (harvestedFees.sol.isZero() && harvestedFees.tokens.isZero()) {
      logger.info({ launchId: launch.launchId }, "CompoundJob: no fees to harvest");
      return;
    }

    // 2. Calculate split: 99% LP, 1% House
    const lpSol = harvestedFees.sol.mul(new BN(99)).div(new BN(100));
    const houseSol = harvestedFees.sol.sub(lpSol);
    const lpTokens = harvestedFees.tokens.mul(new BN(99)).div(new BN(100));
    const houseTokens = harvestedFees.tokens.sub(lpTokens);

    logger.info({
      launchId: launch.launchId,
      harvestedSol: harvestedFees.sol.toString(),
      harvestedTokens: harvestedFees.tokens.toString(),
      lpSol: lpSol.toString(),
      houseSol: houseSol.toString(),
    }, "CompoundJob: fee split calculated");

    // 3. Re-deposit LP portion into position
    // In production: call venue_adapters::add_liquidity
    // await this.addLiquidity(launch, lpSol, lpTokens);

    // 4. Transfer house portion to HouseVault
    // In production: transfer SOL/tokens to house vault
    // await this.transferToHouse(launch, houseSol, houseTokens);

    // 5. Record compound in AgencyVaults
    // In production: call agency_vaults::record_compound
    // await this.recordCompound(launch, lpSol, houseSol);

    logger.info({ launchId: launch.launchId }, "CompoundJob: completed");
  }

  private async harvestFees(_launch: ActiveLaunch): Promise<HarvestResult> {
    return { available: false, sol: new BN(0), tokens: new BN(0) };
  }

  private async getActiveLaunches(): Promise<ActiveLaunch[]> {
    const rows = await getActiveStewardingLaunches();
    return rows
      .filter((r) => r.vault_state && r.adapter_state)
      .map((r) => {
        const keys = rowToPublicKeys(r);
        return {
          launchId: r.launch_id,
          mint: keys.mint,
          adapterState: keys.adapterState!,
          vaultState: keys.vaultState!,
        };
      });
  }
}

interface ActiveLaunch {
  launchId: string;
  mint: PublicKey;
  adapterState: PublicKey;
  vaultState: PublicKey;
}
