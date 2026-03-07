import { Buffer } from "buffer";
import { PublicKey } from "@solana/web3.js";

// ── Browser Web Worker for vanity address grinding ─────────────────────────
//
// Runs in a dedicated thread so the UI stays responsive.
// Batches SHA-256 calls via crypto.subtle.digest for throughput.

const BATCH_SIZE = 500;
const REPORT_EVERY_N_BATCHES = 4; // report progress every ~2000 attempts

function hexBytes(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

self.onmessage = async (event: MessageEvent) => {
  const { suffix, programIdBase58, seedString, workerId } = event.data as {
    suffix: string;
    programIdBase58: string;
    seedString: string;
    workerId: number;
  };

  const programId = new PublicKey(programIdBase58);
  const seed = Buffer.from(seedString, "utf-8");
  const suffixLen = suffix.length;
  let attempts = 0;
  let batchCount = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Generate a batch of random candidate keys
    const keys: string[] = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const rb = new Uint8Array(16);
      crypto.getRandomValues(rb);
      keys.push(`bv${workerId}_${hexBytes(rb)}`);
    }

    // Hash all candidates in parallel via crypto.subtle
    const hashes = await Promise.all(
      keys.map((k) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(k))),
    );

    // Check each derived mint address synchronously
    for (let i = 0; i < BATCH_SIZE; i++) {
      const launchId = Buffer.from(new Uint8Array(hashes[i]).slice(0, 32));
      const [pda] = PublicKey.findProgramAddressSync([seed, launchId], programId);
      const addr = pda.toBase58();
      attempts++;

      if (addr.slice(-suffixLen) === suffix) {
        (self as unknown as Worker).postMessage({
          type: "found",
          key: keys[i],
          address: addr,
          launchIdHex: launchId.toString("hex"),
          attempts,
        });
        return;
      }
    }

    batchCount++;
    if (batchCount % REPORT_EVERY_N_BATCHES === 0) {
      (self as unknown as Worker).postMessage({ type: "progress", attempts });
    }
  }
};
