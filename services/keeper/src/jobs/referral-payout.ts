import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { logger } from "../logger";

// ── Config ─────────────────────────────────────────────────────────────────

/** Minimum payout threshold: 0.01 SOL */
const MIN_PAYOUT_LAMPORTS = BigInt(
  process.env.REFERRAL_MIN_PAYOUT_LAMPORTS ?? String(LAMPORTS_PER_SOL / 100),
);
/** Max payouts per run to avoid tx spam */
const MAX_PAYOUTS_PER_RUN = parseInt(process.env.REFERRAL_MAX_PAYOUTS_PER_RUN ?? "50", 10);
/** Reserve buffer: keep at least 0.005 SOL in vault for rent */
const VAULT_RESERVE_LAMPORTS = BigInt(LAMPORTS_PER_SOL / 200);

// ── Types ──────────────────────────────────────────────────────────────────

interface PendingPayout {
  referrer_wallet: string;
  total_earned: bigint;
  total_paid: bigint;
  pending: bigint;
}

/**
 * Referral Payout Job
 *
 * Runs on a cron schedule (e.g., every 30 minutes).
 * 1. Queries DB for referrers with pending balances above threshold
 * 2. Checks referral_vault on-chain balance
 * 3. Sends SOL from referral_vault → individual referrer wallets
 * 4. Records each payout in referral_payouts table
 *
 * The referral_vault is a regular keypair wallet (not a PDA) —
 * fees flow into it on-chain, and this keeper holds the key to distribute out.
 */
export class ReferralPayoutJob {
  private referralVaultKeypair: Keypair | null = null;

  constructor(
    private connection: Connection,
    private keeper: Keypair,
    private getPool: () => Promise<any>,
  ) {}

  /** Load the referral vault keypair from env/file */
  private loadVaultKeypair(): Keypair | null {
    if (this.referralVaultKeypair) return this.referralVaultKeypair;

    const keyPath = process.env.REFERRAL_VAULT_KEYPAIR_PATH;
    const keyJson = process.env.REFERRAL_VAULT_KEYPAIR_JSON;

    try {
      if (keyJson) {
        const parsed = JSON.parse(keyJson);
        this.referralVaultKeypair = Keypair.fromSecretKey(Uint8Array.from(parsed));
      } else if (keyPath) {
        const fs = require("fs");
        const data = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
        this.referralVaultKeypair = Keypair.fromSecretKey(Uint8Array.from(data));
      } else {
        logger.warn("ReferralPayoutJob: No REFERRAL_VAULT_KEYPAIR_PATH or _JSON set — skipping");
        return null;
      }

      logger.info(
        `ReferralPayoutJob: vault pubkey = ${this.referralVaultKeypair!.publicKey.toBase58()}`,
      );
      return this.referralVaultKeypair;
    } catch (err) {
      logger.error({ err }, "ReferralPayoutJob: failed to load vault keypair");
      return null;
    }
  }

  async run(): Promise<void> {
    logger.info("ReferralPayoutJob: starting payout cycle...");

    const vaultKp = this.loadVaultKeypair();
    if (!vaultKp) return;

    const db = await this.getPool();
    if (!db) {
      logger.warn("ReferralPayoutJob: no DB — skipping");
      return;
    }

    // 1. Get pending balances above threshold
    const pendingPayouts = await this.getPendingPayouts(db);
    if (pendingPayouts.length === 0) {
      logger.info("ReferralPayoutJob: no pending payouts above threshold");
      return;
    }

    logger.info(
      `ReferralPayoutJob: ${pendingPayouts.length} referrer(s) eligible for payout`,
    );

    // 2. Check vault balance
    const vaultBalance = await this.connection.getBalance(vaultKp.publicKey);
    const availableBalance = BigInt(vaultBalance) - VAULT_RESERVE_LAMPORTS;

    if (availableBalance <= 0n) {
      logger.warn(
        `ReferralPayoutJob: vault balance too low (${vaultBalance} lamports) — skipping`,
      );
      return;
    }

    logger.info(
      `ReferralPayoutJob: vault balance = ${(Number(vaultBalance) / LAMPORTS_PER_SOL).toFixed(4)} SOL, available = ${(Number(availableBalance) / LAMPORTS_PER_SOL).toFixed(4)} SOL`,
    );

    // 3. Process payouts in order (largest first), respecting available balance
    let totalPaid = 0n;
    let successCount = 0;
    let failCount = 0;

    for (const payout of pendingPayouts) {
      const remaining = availableBalance - totalPaid;
      if (remaining < MIN_PAYOUT_LAMPORTS) {
        logger.info("ReferralPayoutJob: vault funds exhausted for this cycle");
        break;
      }

      // Cap payout to available balance
      const amount = payout.pending > remaining ? remaining : payout.pending;

      // Create payout record first (status: processing)
      const payoutId = await this.createPayoutRecord(db, payout.referrer_wallet, amount);
      if (!payoutId) {
        failCount++;
        continue;
      }

      // Send the transfer
      const txSig = await this.sendPayout(vaultKp, payout.referrer_wallet, amount);

      if (txSig) {
        await this.completePayoutRecord(db, payoutId, txSig);
        totalPaid += amount;
        successCount++;
        logger.info(
          `ReferralPayoutJob: ✔ Paid ${(Number(amount) / LAMPORTS_PER_SOL).toFixed(4)} SOL → ${payout.referrer_wallet.slice(0, 8)}... (tx: ${txSig.slice(0, 16)}...)`,
        );
      } else {
        await this.failPayoutRecord(db, payoutId);
        failCount++;
        logger.error(
          `ReferralPayoutJob: ✗ Failed payout to ${payout.referrer_wallet.slice(0, 8)}...`,
        );
      }
    }

    logger.info(
      `ReferralPayoutJob: cycle complete — ${successCount} paid, ${failCount} failed, ${(Number(totalPaid) / LAMPORTS_PER_SOL).toFixed(4)} SOL distributed`,
    );
  }

  // ── DB Queries ─────────────────────────────────────────────────────────

  private async getPendingPayouts(db: any): Promise<PendingPayout[]> {
    try {
      const result = await db.query(
        `SELECT
           e.referrer_wallet,
           COALESCE(SUM(e.earned_lamports), 0)::bigint AS total_earned,
           COALESCE(p.total_paid, 0)::bigint AS total_paid
         FROM referral_earnings e
         LEFT JOIN (
           SELECT referrer_wallet, SUM(amount_lamports)::bigint AS total_paid
           FROM referral_payouts
           WHERE status IN ('completed', 'processing')
           GROUP BY referrer_wallet
         ) p ON p.referrer_wallet = e.referrer_wallet
         GROUP BY e.referrer_wallet, p.total_paid
         HAVING (COALESCE(SUM(e.earned_lamports), 0) - COALESCE(p.total_paid, 0)) >= $1
         ORDER BY (COALESCE(SUM(e.earned_lamports), 0) - COALESCE(p.total_paid, 0)) DESC
         LIMIT $2`,
        [MIN_PAYOUT_LAMPORTS.toString(), MAX_PAYOUTS_PER_RUN],
      );

      return result.rows.map((row: any) => ({
        referrer_wallet: row.referrer_wallet,
        total_earned: BigInt(row.total_earned),
        total_paid: BigInt(row.total_paid),
        pending: BigInt(row.total_earned) - BigInt(row.total_paid),
      }));
    } catch (err) {
      logger.error({ err }, "ReferralPayoutJob: failed to query pending payouts");
      return [];
    }
  }

  private async createPayoutRecord(
    db: any,
    wallet: string,
    amount: bigint,
  ): Promise<number | null> {
    try {
      const result = await db.query(
        `INSERT INTO referral_payouts (referrer_wallet, amount_lamports, status)
         VALUES ($1, $2, 'processing')
         RETURNING id`,
        [wallet, amount.toString()],
      );
      return result.rows[0]?.id ?? null;
    } catch (err) {
      logger.error({ err, wallet }, "ReferralPayoutJob: failed to create payout record");
      return null;
    }
  }

  private async completePayoutRecord(db: any, payoutId: number, txSig: string): Promise<void> {
    try {
      await db.query(
        `UPDATE referral_payouts
         SET status = 'completed', tx_signature = $2, completed_at = NOW()
         WHERE id = $1`,
        [payoutId, txSig],
      );
    } catch (err) {
      logger.error({ err, payoutId }, "ReferralPayoutJob: failed to mark payout completed");
    }
  }

  private async failPayoutRecord(db: any, payoutId: number): Promise<void> {
    try {
      await db.query(
        `UPDATE referral_payouts SET status = 'failed' WHERE id = $1`,
        [payoutId],
      );
    } catch (err) {
      logger.error({ err, payoutId }, "ReferralPayoutJob: failed to mark payout failed");
    }
  }

  // ── Solana Transfer ────────────────────────────────────────────────────

  private async sendPayout(
    vaultKp: Keypair,
    recipientAddress: string,
    amount: bigint,
  ): Promise<string | null> {
    try {
      const recipient = new PublicKey(recipientAddress);

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: vaultKp.publicKey,
          toPubkey: recipient,
          lamports: amount,
        }),
      );

      const sig = await sendAndConfirmTransaction(this.connection, tx, [vaultKp], {
        commitment: "confirmed",
        maxRetries: 3,
      });

      return sig;
    } catch (err) {
      logger.error(
        { err, recipient: recipientAddress, amount: amount.toString() },
        "ReferralPayoutJob: transfer failed",
      );
      return null;
    }
  }
}
