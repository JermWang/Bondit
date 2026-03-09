import { parentPort, workerData } from "worker_threads";
import crypto from "crypto";
import { PublicKey } from "@solana/web3.js";

// ── High-Performance Vanity Grinder ─────────────────────────────────────────
//
// Optimisations:
//   1. Counter-based iteration — no crypto.randomBytes syscall per loop
//   2. Uses native PublicKey.findProgramAddressSync for PDA + curve check
//      (leverages tweetnacl's optimised C/WASM, NOT pure JS field math)
//   3. Batch processing with event-loop yield for pause/resume
//   4. Less frequent progress reports to reduce IPC overhead

interface GrinderData {
  suffix: string;
  programIdBytes: number[];
  seedString: string;
  workerId: number;
}

const { suffix, programIdBytes, seedString, workerId } = workerData as GrinderData;

const programId = new PublicKey(Buffer.from(programIdBytes));
const seed = Buffer.from(seedString, "utf-8");
const suffixLen = suffix.length;

// ── Counter-based key generation ────────────────────────────────────────────
const counterBuf = crypto.randomBytes(16);
const counterView = new DataView(counterBuf.buffer, counterBuf.byteOffset);

function incrementCounter() {
  const lo = counterView.getUint32(0, true);
  counterView.setUint32(0, (lo + 1) >>> 0, true);
  if (lo === 0xffffffff) {
    const hi = counterView.getUint32(4, true);
    counterView.setUint32(4, (hi + 1) >>> 0, true);
  }
}

const keyPrefix = `bv${workerId}_`;
let attempts = 0;
let running = true;

parentPort?.on("message", (msg: string) => {
  if (msg === "stop") running = false;
  if (msg === "resume") running = true;
});

const REPORT_INTERVAL = 50_000;
const BATCH_SIZE = 2_000;

function grindBatch(): void {
  for (let b = 0; b < BATCH_SIZE; b++) {
    incrementCounter();

    const keyHex = counterBuf.toString("hex");
    const key = keyPrefix + keyHex;

    // Hash to launchId
    const launchId = crypto.createHash("sha256").update(key).digest().subarray(0, 32);

    // Native PDA derivation — uses tweetnacl's optimised curve check
    const [pda] = PublicKey.findProgramAddressSync([seed, launchId], programId);
    const addr = pda.toBase58();
    attempts++;

    if (addr.endsWith(suffix)) {
      parentPort?.postMessage({
        type: "found",
        key,
        address: addr,
        launchIdHex: Buffer.from(launchId).toString("hex"),
        attempts,
      });
      attempts = 0;
    }
  }

  if (attempts >= REPORT_INTERVAL) {
    parentPort?.postMessage({ type: "progress", attempts });
    attempts = 0;
  }
}

function loop() {
  if (!running) {
    setTimeout(loop, 100);
    return;
  }
  grindBatch();
  setImmediate(loop);
}

loop();
