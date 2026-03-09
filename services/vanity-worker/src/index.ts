import "dotenv/config";
import { Worker } from "worker_threads";
import path from "path";
import os from "os";
import { Pool } from "pg";
import { PublicKey } from "@solana/web3.js";

// ── Config ─────────────────────────────────────────────────────────────────

const SUFFIX = process.env.VANITY_SUFFIX || "LoL";
const PROGRAM_ID = process.env.LAUNCH_FACTORY_PROGRAM_ID || "";
const SEED_STRING = "token_mint";
const BACKLOG_TARGET = parseInt(process.env.VANITY_BACKLOG_TARGET || "100", 10);
const CHECK_INTERVAL_MS = parseInt(process.env.VANITY_CHECK_INTERVAL_MS || "5000", 10);
const NUM_WORKERS = parseInt(process.env.VANITY_WORKERS || String(Math.max(1, os.cpus().length - 1)), 10);

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/bondit";

// ── DB ─────────────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: DATABASE_URL });

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vanity_backlog (
      id              BIGSERIAL PRIMARY KEY,
      idempotency_key TEXT NOT NULL UNIQUE,
      launch_id_hex   TEXT NOT NULL,
      mint_address    TEXT NOT NULL,
      suffix          TEXT NOT NULL DEFAULT 'LoL',
      claimed_at      TIMESTAMPTZ,
      claimed_by      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vanity_backlog_unclaimed
      ON vanity_backlog(suffix, id) WHERE claimed_at IS NULL;
  `);
}

async function getUnclaimedCount(): Promise<number> {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM vanity_backlog WHERE suffix = $1 AND claimed_at IS NULL",
    [SUFFIX],
  );
  return result.rows[0]?.count ?? 0;
}

async function insertKey(key: string, launchIdHex: string, mintAddress: string): Promise<boolean> {
  try {
    await pool.query(
      "INSERT INTO vanity_backlog (idempotency_key, launch_id_hex, mint_address, suffix) VALUES ($1, $2, $3, $4) ON CONFLICT (idempotency_key) DO NOTHING",
      [key, launchIdHex, mintAddress, SUFFIX],
    );
    return true;
  } catch (err) {
    console.error("[vanity-worker] DB insert error:", (err as Error).message);
    return false;
  }
}

// ── Worker Management ──────────────────────────────────────────────────────

interface GrinderMsg {
  type: "found" | "progress";
  key?: string;
  address?: string;
  launchIdHex?: string;
  attempts: number;
}

let totalFound = 0;
let totalAttempts = 0;
let paused = false;
const workerAttempts = new Map<number, number>();
const workers: Worker[] = [];

function spawnWorker(id: number): Worker {
  const ext = __filename.endsWith(".ts") ? ".ts" : ".js";
  const workerPath = path.join(__dirname, `grinder${ext}`);

  const execArgv = ext === ".ts" ? ["-r", "ts-node/register"] : [];

  const worker = new Worker(workerPath, {
    workerData: {
      suffix: SUFFIX,
      programIdBytes: Array.from(new PublicKey(PROGRAM_ID).toBytes()),
      seedString: SEED_STRING,
      workerId: id,
    },
    execArgv,
  });

  worker.on("message", async (msg: GrinderMsg) => {
    if (msg.type === "progress") {
      workerAttempts.set(id, (workerAttempts.get(id) || 0) + msg.attempts);
      totalAttempts = Array.from(workerAttempts.values()).reduce((a, b) => a + b, 0);
    }

    if (msg.type === "found" && msg.key && msg.address && msg.launchIdHex) {
      workerAttempts.set(id, (workerAttempts.get(id) || 0) + msg.attempts);
      totalAttempts = Array.from(workerAttempts.values()).reduce((a, b) => a + b, 0);

      const ok = await insertKey(msg.key, msg.launchIdHex, msg.address);
      if (ok) {
        totalFound++;
        console.log(`\n[vanity-worker] ════════════════════════════════════════════`);
        console.log(`[vanity-worker] ✔ VANITY #${totalFound}/${BACKLOG_TARGET} FOUND!`);
        console.log(`[vanity-worker]   Contract Address: ${msg.address}`);
        console.log(`[vanity-worker]   Suffix Match:     ...${msg.address.slice(-SUFFIX.length)}`);
        console.log(`[vanity-worker]   Idem Key:         ${msg.key}`);
        console.log(`[vanity-worker]   Attempts:         ${msg.attempts.toLocaleString()} (${totalAttempts.toLocaleString()} total)`);
        console.log(`[vanity-worker] ════════════════════════════════════════════\n`);
      }
    }
  });

  worker.on("error", (err) => {
    console.error(`[vanity-worker] Worker ${id} error:`, err.message);
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      console.warn(`[vanity-worker] Worker ${id} exited with code ${code}, respawning...`);
      const idx = workers.indexOf(worker);
      if (idx !== -1) {
        workers[idx] = spawnWorker(id);
      }
    }
  });

  return worker;
}

function pauseWorkers(): void {
  if (!paused) {
    paused = true;
    for (const w of workers) w.postMessage("stop");
    console.log(`[vanity-worker] Paused — backlog at target (${BACKLOG_TARGET}+)`);
  }
}

function resumeWorkers(): void {
  if (paused) {
    paused = false;
    // Respawn workers since they exited their loop
    for (let i = 0; i < workers.length; i++) {
      workers[i].terminate();
      workers[i] = spawnWorker(i);
    }
    console.log("[vanity-worker] Resumed grinding");
  }
}

// ── Main Loop ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  BondIt.lol — Vanity Background Worker          ║");
  console.log(`║  Suffix: ${SUFFIX.padEnd(8)}  Target: ${String(BACKLOG_TARGET).padEnd(5)}  Workers: ${String(NUM_WORKERS).padEnd(2)} ║`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();

  // Validate program ID before spawning workers
  if (!PROGRAM_ID) {
    console.warn("[vanity-worker] LAUNCH_FACTORY_PROGRAM_ID is not set. Sleeping until configured.");
    await new Promise(() => {}); // sleep forever
    return;
  }
  try {
    new PublicKey(PROGRAM_ID);
  } catch {
    console.error(`[vanity-worker] LAUNCH_FACTORY_PROGRAM_ID is not a valid public key: "${PROGRAM_ID}". Sleeping until fixed.`);
    await new Promise(() => {}); // sleep forever
    return;
  }
  console.log(`[vanity-worker] Program ID: ${PROGRAM_ID}`);

  await ensureTable();
  const initial = await getUnclaimedCount();
  console.log(`[vanity-worker] Current unclaimed backlog: ${initial}`);

  // Spawn grinder threads
  for (let i = 0; i < NUM_WORKERS; i++) {
    workers.push(spawnWorker(i));
  }

  if (initial >= BACKLOG_TARGET) {
    pauseWorkers();
  }

  // Periodically check backlog level and pause/resume as needed
  setInterval(async () => {
    try {
      const count = await getUnclaimedCount();
      const rate = Math.round(totalAttempts / Math.max((Date.now() - startTime) / 1000, 1));

      console.log(
        `[vanity-worker] Backlog: ${count}/${BACKLOG_TARGET} | Found: ${totalFound} | Rate: ${rate.toLocaleString()}/sec | ${paused ? "PAUSED" : "GRINDING"}`,
      );

      if (count >= BACKLOG_TARGET && !paused) {
        pauseWorkers();
      } else if (count < BACKLOG_TARGET && paused) {
        resumeWorkers();
      }
    } catch (err) {
      console.error("[vanity-worker] Health check error:", (err as Error).message);
    }
  }, CHECK_INTERVAL_MS);
}

const startTime = Date.now();
main().catch((err) => {
  console.error("[vanity-worker] Fatal:", err);
  process.exit(1);
});
