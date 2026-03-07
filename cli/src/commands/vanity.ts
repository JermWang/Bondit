import { Worker } from "worker_threads";
import path from "path";
import os from "os";
import chalk from "chalk";
import ora from "ora";
import { log } from "../utils/logger";
import { readConfig, writeConfig, CONFIG_FILENAME } from "../utils/config";
import {
  LAUNCH_FACTORY_PROGRAM_ID,
  deriveAllPDAs,
} from "@bondit/sdk";

// ── Types ──────────────────────────────────────────────────────────────────

export interface VanityResult {
  idempotencyKey: string;
  launchIdHex: string;
  mintAddress: string;
  launchStateAddress: string;
  totalAttempts: number;
  duration: number;
  attemptsPerSecond: number;
}

interface WorkerFoundMsg {
  type: "found";
  key: string;
  address: string;
  launchIdHex: string;
  attempts: number;
}

interface WorkerProgressMsg {
  type: "progress";
  attempts: number;
}

type WorkerMsg = WorkerFoundMsg | WorkerProgressMsg;

// ── Vanity search engine ───────────────────────────────────────────────────

export async function runVanitySearch(opts: {
  suffix?: string;
  target?: "mint" | "launch";
  workers?: number;
  maxAttempts?: number;
  quiet?: boolean;
}): Promise<VanityResult | null> {
  const suffix = opts.suffix || "LoL";
  const target = opts.target || "mint";
  const numWorkers = opts.workers || Math.max(1, os.cpus().length - 1);
  const maxAttempts = opts.maxAttempts || Infinity;
  const quiet = opts.quiet || false;

  // Validate suffix is valid base58
  const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  for (const ch of suffix) {
    if (!BASE58_CHARS.includes(ch)) {
      log.error(`Invalid Base58 character in suffix: '${ch}'`);
      log.dim(`Base58 excludes: 0, O, I, l`);
      log.dim(`Tip: Use "LoL" (uppercase L, lowercase o, uppercase L) instead of "LOL"`);
      return null;
    }
  }

  // Determine the seed based on target
  let seedString: string;
  let programIdBase58: string;

  switch (target) {
    case "mint":
      seedString = "token_mint";
      programIdBase58 = LAUNCH_FACTORY_PROGRAM_ID.toBase58();
      break;
    case "launch":
      seedString = "launch_state";
      programIdBase58 = LAUNCH_FACTORY_PROGRAM_ID.toBase58();
      break;
    default:
      log.error(`Unknown target: ${target}. Use "mint" or "launch".`);
      return null;
  }

  // Estimate difficulty
  const expectedAttempts = Math.pow(58, suffix.length);

  if (!quiet) {
    log.heading("Vanity Address Search");
    log.kv("Target", target === "mint" ? "Token Mint" : "Launch State");
    log.kvAccent("Suffix", suffix);
    log.kv("Workers", String(numWorkers));
    log.kv("Expected attempts", `~${expectedAttempts.toLocaleString()}`);
    log.divider();
  }

  const spinner = ora({
    text: `Grinding for address ending with ${chalk.hex("#A9FF00")(suffix)}...`,
    color: "green",
  }).start();

  const startTime = Date.now();
  const workerAttempts = new Map<number, number>();

  return new Promise((resolve) => {
    const workers: Worker[] = [];
    let found = false;

    // Determine worker file path (ts-node vs compiled)
    const ext = __filename.endsWith(".ts") ? ".ts" : ".js";
    const workerPath = path.join(__dirname, `../workers/vanity-worker${ext}`);

    const execArgv = ext === ".ts"
      ? ["-r", "ts-node/register"]
      : [];

    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(workerPath, {
        workerData: {
          suffix,
          caseSensitive: true,
          programIdBase58,
          seedString,
          workerId: i,
        },
        execArgv,
      });

      worker.on("message", (msg: WorkerMsg) => {
        if (msg.type === "progress") {
          workerAttempts.set(i, msg.attempts);
          const total = Array.from(workerAttempts.values()).reduce((a, b) => a + b, 0);
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = Math.round(total / Math.max(elapsed, 0.1));
          spinner.text = `Grinding... ${chalk.white(total.toLocaleString())} attempts ` +
            `(${chalk.hex("#A9FF00")(rate.toLocaleString() + "/sec")})`;

          // Check max attempts
          if (maxAttempts !== Infinity && total >= maxAttempts) {
            for (const w of workers) {
              w.postMessage("stop");
              w.terminate();
            }
            spinner.stop();
            log.warn(`Stopped after ${total.toLocaleString()} attempts without finding a match.`);
            resolve(null);
          }
        }

        if (msg.type === "found" && !found) {
          found = true;
          workerAttempts.set(i, msg.attempts);
          const totalAttempts = Array.from(workerAttempts.values()).reduce((a, b) => a + b, 0);
          const duration = (Date.now() - startTime) / 1000;
          const attemptsPerSecond = Math.round(totalAttempts / Math.max(duration, 0.1));

          // Stop all workers
          for (const w of workers) {
            w.postMessage("stop");
            w.terminate();
          }

          spinner.stop();

          // Derive all PDAs for display
          const launchId = Buffer.from(msg.launchIdHex, "hex");
          const pdas = deriveAllPDAs(launchId);

          if (!quiet) {
            console.log();
            log.success(`Found vanity address in ${chalk.hex("#A9FF00")(duration.toFixed(1) + "s")}`);
            log.divider();
            log.kvAccent("Idempotency Key", msg.key);
            log.kv("Launch ID", msg.launchIdHex.slice(0, 32) + "...");
            console.log();
            log.kvAccent("Token Mint", pdas.tokenMint.address.toBase58());
            log.kv("Launch State", pdas.launchState.address.toBase58());
            log.kv("Curve State", pdas.curveState.address.toBase58());
            log.kv("Vault State", pdas.vaultState.address.toBase58());
            log.kv("Policy State", pdas.policyState.address.toBase58());
            console.log();
            log.kv("Total attempts", totalAttempts.toLocaleString());
            log.kv("Speed", `${attemptsPerSecond.toLocaleString()} attempts/sec`);
            log.divider();
          }

          resolve({
            idempotencyKey: msg.key,
            launchIdHex: msg.launchIdHex,
            mintAddress: pdas.tokenMint.address.toBase58(),
            launchStateAddress: pdas.launchState.address.toBase58(),
            totalAttempts,
            duration,
            attemptsPerSecond,
          });
        }
      });

      worker.on("error", (err) => {
        if (!found) {
          spinner.stop();
          log.error(`Worker ${i} error: ${err.message}`);
        }
      });

      workers.push(worker);
    }
  });
}

// ── CLI command ────────────────────────────────────────────────────────────

export async function vanityCommand(opts: {
  suffix?: string;
  target?: string;
  workers?: number;
  maxAttempts?: number;
  save?: boolean;
}): Promise<void> {
  const result = await runVanitySearch({
    suffix: opts.suffix,
    target: (opts.target as "mint" | "launch") || "mint",
    workers: opts.workers,
    maxAttempts: opts.maxAttempts,
  });

  if (!result) return;

  // Optionally save to config
  const shouldSave = opts.save !== false; // default: save
  if (shouldSave) {
    try {
      const config = readConfig();
      config.idempotencyKey = result.idempotencyKey;
      writeConfig(config);
      log.success(`Saved vanity key to ${CONFIG_FILENAME}`);
      log.dim("Run `bondit launch create` to launch with this vanity address.");
    } catch {
      log.dim(`No ${CONFIG_FILENAME} found. Run \`bondit launch init\` first, then re-run vanity.`);
      log.dim(`Or manually set idempotencyKey: "${result.idempotencyKey}"`);
    }
  }
}
