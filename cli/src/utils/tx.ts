import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SendTransactionError,
} from "@solana/web3.js";
import { log } from "./logger";

// ── Retry Policy ────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const NON_RETRYABLE_ERRORS = [
  "already in use",
  "insufficient funds",
  "NameTooLong",
  "SymbolTooLong",
  "UriTooLong",
  "InvalidStatus",
  "Simulation failed",
];

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return !NON_RETRYABLE_ERRORS.some((pattern) => msg.includes(pattern));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Simulate ────────────────────────────────────────────────────────────────

export async function simulateTransaction(
  connection: Connection,
  tx: Transaction,
  payer: Keypair
): Promise<{ success: boolean; logs: string[]; unitsConsumed: number }> {
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const sim = await connection.simulateTransaction(tx, [payer]);

  return {
    success: sim.value.err === null,
    logs: sim.value.logs ?? [],
    unitsConsumed: sim.value.unitsConsumed ?? 0,
  };
}

// ── Send with Retry ─────────────────────────────────────────────────────────

export async function sendWithRetry(
  connection: Connection,
  tx: Transaction,
  signers: Keypair[],
  label: string = "transaction"
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        log.warn(`Retry ${attempt}/${MAX_RETRIES} for ${label}...`);
        await sleep(RETRY_DELAY_MS * attempt);
      }

      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = signers[0].publicKey;

      const sig = await sendAndConfirmTransaction(connection, tx, signers, {
        commitment: "confirmed",
        maxRetries: 2,
      });

      return sig;
    } catch (err) {
      lastError = err;

      if (!isRetryable(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Non-retryable error on ${label}: ${msg}`);
      }

      if (attempt === MAX_RETRIES) {
        break;
      }
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${label} failed after ${MAX_RETRIES} attempts: ${msg}`);
}
