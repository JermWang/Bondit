import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// ── Config ─────────────────────────────────────────────────────────────────

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const DATABASE_URL = process.env.DATABASE_URL ?? "";
const VAULT_KEY_JSON = process.env.REFERRAL_VAULT_KEYPAIR_JSON ?? "";

const MIN_PAYOUT_LAMPORTS = BigInt(
  process.env.REFERRAL_MIN_PAYOUT_LAMPORTS ?? String(LAMPORTS_PER_SOL / 100),
);
const MAX_PAYOUTS_PER_RUN = parseInt(process.env.REFERRAL_MAX_PAYOUTS_PER_RUN ?? "50", 10);
const VAULT_RESERVE_LAMPORTS = BigInt(LAMPORTS_PER_SOL / 200); // 0.005 SOL

// ── Auth ───────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  // Vercel cron sends this header automatically
  const vercelHeader = req.headers.get("x-vercel-cron-secret");
  if (vercelHeader && vercelHeader === CRON_SECRET) return true;

  // cron-jobs.org / manual trigger via Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${CRON_SECRET}`) return true;

  return false;
}

// ── DB (lightweight inline pool — serverless-safe) ─────────────────────────

let poolInstance: any = null;

async function getPool() {
  if (poolInstance) return poolInstance;
  if (!DATABASE_URL) return null;

  const { Pool } = await import("pg");
  poolInstance = new Pool({
    connectionString: DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    ssl: DATABASE_URL.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  return poolInstance;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface PendingPayout {
  referrer_wallet: string;
  total_earned: bigint;
  total_paid: bigint;
  pending: bigint;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || !isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log: string[] = [];
  const push = (msg: string) => {
    log.push(msg);
    console.log(`[referral-payout] ${msg}`);
  };

  try {
    // 1. Load vault keypair
    if (!VAULT_KEY_JSON) {
      return NextResponse.json({ error: "REFERRAL_VAULT_KEYPAIR_JSON not configured" }, { status: 503 });
    }

    let vaultKp: Keypair;
    try {
      const parsed = JSON.parse(VAULT_KEY_JSON);
      vaultKp = Keypair.fromSecretKey(Uint8Array.from(parsed));
    } catch {
      return NextResponse.json({ error: "Invalid vault keypair" }, { status: 503 });
    }

    push(`Vault: ${vaultKp.publicKey.toBase58()}`);

    // 2. Connect to DB
    const pool = await getPool();
    if (!pool) {
      return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
    }

    // 3. Query pending balances
    const pendingResult = await pool.query(
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

    const payouts: PendingPayout[] = pendingResult.rows.map((row: any) => ({
      referrer_wallet: row.referrer_wallet,
      total_earned: BigInt(row.total_earned),
      total_paid: BigInt(row.total_paid),
      pending: BigInt(row.total_earned) - BigInt(row.total_paid),
    }));

    if (payouts.length === 0) {
      push("No pending payouts above threshold");
      return NextResponse.json({ status: "ok", log, payouts_processed: 0 });
    }

    push(`${payouts.length} referrer(s) eligible`);

    // 4. Check vault balance
    const connection = new Connection(RPC_URL, "confirmed");
    const vaultBalance = await connection.getBalance(vaultKp.publicKey);
    const availableBalance = BigInt(vaultBalance) - VAULT_RESERVE_LAMPORTS;

    push(`Vault balance: ${(Number(vaultBalance) / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

    if (availableBalance <= BigInt(0)) {
      push("Vault balance too low — skipping");
      return NextResponse.json({ status: "ok", log, payouts_processed: 0, reason: "low_balance" });
    }

    // 5. Process payouts
    let totalPaid = BigInt(0);
    let successCount = 0;
    let failCount = 0;

    for (const payout of payouts) {
      const remaining = availableBalance - totalPaid;
      if (remaining < MIN_PAYOUT_LAMPORTS) {
        push("Vault funds exhausted for this cycle");
        break;
      }

      const amount = payout.pending > remaining ? remaining : payout.pending;

      // Create record (processing)
      let payoutId: number;
      try {
        const insertResult = await pool.query(
          `INSERT INTO referral_payouts (referrer_wallet, amount_lamports, status)
           VALUES ($1, $2, 'processing') RETURNING id`,
          [payout.referrer_wallet, amount.toString()],
        );
        payoutId = insertResult.rows[0].id;
      } catch (err) {
        push(`Failed to create record for ${payout.referrer_wallet.slice(0, 8)}...`);
        failCount++;
        continue;
      }

      // Send transfer
      try {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: vaultKp.publicKey,
            toPubkey: new PublicKey(payout.referrer_wallet),
            lamports: Number(amount),
          }),
        );

        const sig = await sendAndConfirmTransaction(connection, tx, [vaultKp], {
          commitment: "confirmed",
          maxRetries: 3,
        });

        await pool.query(
          `UPDATE referral_payouts SET status = 'completed', tx_signature = $2, completed_at = NOW() WHERE id = $1`,
          [payoutId, sig],
        );

        totalPaid += amount;
        successCount++;
        push(`✔ ${(Number(amount) / LAMPORTS_PER_SOL).toFixed(4)} SOL → ${payout.referrer_wallet.slice(0, 8)}... (${sig.slice(0, 16)}...)`);
      } catch (err) {
        await pool.query(
          `UPDATE referral_payouts SET status = 'failed' WHERE id = $1`,
          [payoutId],
        );
        failCount++;
        push(`✗ Failed → ${payout.referrer_wallet.slice(0, 8)}...`);
      }
    }

    push(`Done: ${successCount} paid, ${failCount} failed, ${(Number(totalPaid) / LAMPORTS_PER_SOL).toFixed(4)} SOL total`);

    return NextResponse.json({
      status: "ok",
      log,
      payouts_processed: successCount,
      payouts_failed: failCount,
      total_paid_sol: (Number(totalPaid) / LAMPORTS_PER_SOL).toFixed(6),
    });
  } catch (err) {
    console.error("[referral-payout] Fatal:", err);
    return NextResponse.json(
      { error: "Internal error", log },
      { status: 500 },
    );
  }
}

// Vercel cron functions must be GET, but also support POST for cron-jobs.org
export async function POST(req: NextRequest) {
  return GET(req);
}
