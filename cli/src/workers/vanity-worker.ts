import { parentPort, workerData } from "worker_threads";
import crypto from "crypto";
import { PublicKey } from "@solana/web3.js";

interface VanityWorkerData {
  suffix: string;
  caseSensitive: boolean;
  programIdBase58: string;
  seedString: string;
  workerId: number;
}

const {
  suffix,
  caseSensitive,
  programIdBase58,
  seedString,
  workerId,
} = workerData as VanityWorkerData;

const programId = new PublicKey(programIdBase58);
const seed = Buffer.from(seedString, "utf-8");

let attempts = 0;
let running = true;

parentPort?.on("message", (msg: string) => {
  if (msg === "stop") running = false;
});

const REPORT_INTERVAL = 5000;

const suffixTarget = caseSensitive ? suffix : suffix.toLowerCase();
const suffixLen = suffix.length;

while (running) {
  const key = `bv${workerId}_${crypto.randomBytes(16).toString("hex")}`;
  const launchId = crypto.createHash("sha256").update(key).digest().slice(0, 32);

  const [pda] = PublicKey.findProgramAddressSync([seed, launchId], programId);
  const addr = pda.toBase58();
  attempts++;

  const tail = caseSensitive
    ? addr.slice(-suffixLen)
    : addr.slice(-suffixLen).toLowerCase();

  if (tail === suffixTarget) {
    parentPort?.postMessage({
      type: "found",
      key,
      address: addr,
      launchIdHex: launchId.toString("hex"),
      attempts,
    });
    break;
  }

  if (attempts % REPORT_INTERVAL === 0) {
    parentPort?.postMessage({ type: "progress", attempts });
  }
}
