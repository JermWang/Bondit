import { parentPort, workerData } from "worker_threads";
import crypto from "crypto";
import { PublicKey } from "@solana/web3.js";

// ── Vanity grinder thread ──────────────────────────────────────────────────
// Each worker thread runs a tight loop generating random idempotency keys,
// hashing to launchId, deriving the token mint PDA, and checking the suffix.

interface GrinderData {
  suffix: string;
  programIdBase58: string;
  seedString: string;
  workerId: number;
}

const {
  suffix,
  programIdBase58,
  seedString,
  workerId,
} = workerData as GrinderData;

const programId = new PublicKey(programIdBase58);
const seed = Buffer.from(seedString, "utf-8");
const suffixLen = suffix.length;

let attempts = 0;
let running = true;

parentPort?.on("message", (msg: string) => {
  if (msg === "stop") running = false;
  if (msg === "resume") running = true;
});

const REPORT_INTERVAL = 10_000;

while (running) {
  const key = `bv${workerId}_${crypto.randomBytes(16).toString("hex")}`;
  const launchId = crypto.createHash("sha256").update(key).digest().slice(0, 32);

  const [pda] = PublicKey.findProgramAddressSync([seed, launchId], programId);
  const addr = pda.toBase58();
  attempts++;

  if (addr.slice(-suffixLen) === suffix) {
    parentPort?.postMessage({
      type: "found",
      key,
      address: addr,
      launchIdHex: launchId.toString("hex"),
      attempts,
    });
    // Reset counter after a find, keep grinding
    attempts = 0;
  }

  if (attempts % REPORT_INTERVAL === 0 && attempts > 0) {
    parentPort?.postMessage({ type: "progress", attempts });
  }
}
