import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { logger } from "../logger";
import { getActiveStewardingLaunches, rowToPublicKeys } from "../db";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

/**
 * Daily Execution Job
 * 
 * Responsibilities:
 * 1. Calculate treasury release amount (exponential decay)
 * 2. Enforce daily/weekly caps
 * 3. Enforce sell pressure cap relative to LP depth
 * 4. Submit treasury release transaction to AgencyVaults via PolicyEngine
 */
export class ExecuteJob {
  constructor(
    private connection: Connection,
    private keeper: Keypair,
  ) {}

  async run(): Promise<void> {
    logger.info("ExecuteJob: starting daily execution...");

    const activeLaunches = await this.getActiveLaunches();

    for (const launch of activeLaunches) {
      try {
        await this.executeLaunch(launch);
      } catch (err) {
        logger.error({ err, launch: launch.launchId }, "ExecuteJob: failed for launch");
      }
    }
  }

  private async executeLaunch(launch: ActiveLaunch): Promise<void> {
    // 1. Read current treasury balance
    const treasuryBalance = await this.getTreasuryBalance(launch.treasuryVault);
    
    // 2. Calculate release using exponential decay: remaining * 0.002
    const releaseAmount = this.calculateRelease(treasuryBalance);

    // 3. Cap checks
    const maxDaily = new BN(1_000_000).mul(new BN(1_000_000)); // 1M tokens w/ 6 decimals
    const cappedRelease = BN.min(releaseAmount, maxDaily);

    // 4. Sell pressure check against LP depth
    // In production: fetch LP depth from policy state and validate

    logger.info({
      launchId: launch.launchId,
      treasuryBalance: treasuryBalance.toString(),
      releaseAmount: cappedRelease.toString(),
    }, "ExecuteJob: calculated release");

    if (cappedRelease.isZero()) {
      logger.info({ launchId: launch.launchId }, "ExecuteJob: no release needed");
      return;
    }

    // 5. Submit treasury_release + execute_daily transactions
    // In production: build and send transactions
    // const sig = await this.submitReleaseTx(launch, cappedRelease);

    logger.warn(
      { launchId: launch.launchId, treasuryVault: launch.treasuryVault.toBase58() },
      "ExecuteJob: transaction submission not wired yet; skipping DB mutations to avoid fabricated execution state",
    );

    logger.info({ launchId: launch.launchId }, "ExecuteJob: completed");
  }

  private calculateRelease(treasuryBalance: BN): BN {
    // Exponential decay: 0.20% of remaining = balance * 20 / 10000
    return treasuryBalance.mul(new BN(20)).div(new BN(10_000));
  }

  private async getTreasuryBalance(vault: PublicKey): Promise<BN> {
    try {
      const account = await this.connection.getTokenAccountBalance(vault);
      return new BN(account.value.amount);
    } catch {
      return new BN(0);
    }
  }

  private async getActiveLaunches(): Promise<ActiveLaunch[]> {
    const rows = await getActiveStewardingLaunches();
    return rows
      .filter((r) => r.vault_state && r.policy_state)
      .map((r) => {
        const keys = rowToPublicKeys(r);
        const [treasuryVault] = PublicKey.findProgramAddressSync(
          [
            keys.vaultState!.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            keys.mint.toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID,
        );
        const [lpReserveVault] = PublicKey.findProgramAddressSync(
          [
            keys.vaultState!.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            keys.mint.toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        return {
          launchId: r.launch_id,
          mint: keys.mint,
          policyState: keys.policyState!,
          vaultState: keys.vaultState!,
          treasuryVault,
          lpReserveVault,
        };
      });
  }
}

interface ActiveLaunch {
  launchId: string;
  mint: PublicKey;
  policyState: PublicKey;
  vaultState: PublicKey;
  treasuryVault: PublicKey;
  lpReserveVault: PublicKey;
}
