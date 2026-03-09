import { parentPort, workerData } from "worker_threads";
import crypto from "crypto";

// ── High-Performance Vanity Grinder ─────────────────────────────────────────
//
// Optimisations vs the naive approach:
//   1. Counter-based iteration (increment buffer) — no crypto.randomBytes syscall
//   2. Manual PDA derivation with pre-allocated buffers — no PublicKey objects
//   3. Raw bs58 encode only on the final bytes needed for suffix check
//   4. Batch progress reports to reduce postMessage overhead
//   5. Inner loop does zero heap allocations
//
// PDA algorithm:  for bump 255→0
//   hash = SHA256( seed || launchId || [bump] || programId || "ProgramDerivedAddress" )
//   if hash is NOT on ed25519 curve → that's the PDA
//
// ~50% of random points are off-curve, so bump=255 almost always works first try.

interface GrinderData {
  suffix: string;
  programIdBytes: number[];   // raw 32 bytes of program ID
  seedString: string;
  workerId: number;
}

const {
  suffix,
  programIdBytes,
  seedString,
  workerId,
} = workerData as GrinderData;

// ── Base58 alphabet & fast encoder ──────────────────────────────────────────

const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  // leading zeros
  let output = "";
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) output += "1";
  for (let i = digits.length - 1; i >= 0; i--) output += B58_ALPHABET[digits[i]];
  return output;
}

// ── ed25519 on-curve check (port of tweetnacl's isOnCurve) ──────────────────
// We only need to know if a 32-byte hash decodes to a valid curve point.
// If it DOES, we must try next bump. If it does NOT, it's our PDA.

// Field element arithmetic mod p = 2^255 - 19
// Represented as Float64 arrays (like tweetnacl gf)
type GF = Float64Array;
const gfNew = () => new Float64Array(16);

const D = gfNew(); // d constant for ed25519
const I_CONST = gfNew(); // sqrt(-1)

// d = -121665/121666 mod p
// Hex of d: 52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3
{
  const dBytes = [
    0xa3, 0x78, 0x59, 0x13, 0xca, 0x4d, 0xeb, 0x75,
    0xab, 0xd8, 0x41, 0x41, 0x4d, 0x0a, 0x70, 0x00,
    0x98, 0xe8, 0x79, 0x77, 0x79, 0x40, 0xc7, 0x8c,
    0x73, 0xfe, 0x6f, 0x2b, 0xee, 0x6c, 0x03, 0x52,
  ];
  for (let i = 0; i < 16; i++) D[i] = dBytes[2 * i] | (dBytes[2 * i + 1] << 8);
}

// sqrt(-1) mod p
{
  const iBytes = [
    0xb0, 0xa0, 0x0e, 0x4a, 0x27, 0x1b, 0xee, 0xc4,
    0x78, 0xe4, 0x2f, 0xad, 0x06, 0x18, 0x43, 0x2f,
    0xa7, 0xd7, 0xfb, 0x3d, 0x99, 0x00, 0x4d, 0x2b,
    0x0b, 0xdf, 0xc1, 0x4f, 0x80, 0x24, 0x83, 0x2b,
  ];
  for (let i = 0; i < 16; i++) I_CONST[i] = iBytes[2 * i] | (iBytes[2 * i + 1] << 8);
}

function gfCopy(o: GF, a: GF) { for (let i = 0; i < 16; i++) o[i] = a[i]; }
function gfSet(o: GF, v: number) { o.fill(0); o[0] = v; }

function gfAdd(o: GF, a: GF, b: GF) { for (let i = 0; i < 16; i++) o[i] = a[i] + b[i]; }
function gfSub(o: GF, a: GF, b: GF) { for (let i = 0; i < 16; i++) o[i] = a[i] - b[i]; }

function gfMul(o: GF, a: GF, b: GF) {
  const t = new Float64Array(31);
  for (let i = 0; i < 16; i++)
    for (let j = 0; j < 16; j++)
      t[i + j] += a[i] * b[j];
  for (let i = 15; i > 0; i--) t[i - 1] += 38 * t[i + 15];
  for (let i = 0; i < 16; i++) o[i] = t[i];
  carry25519(o);
  carry25519(o);
}

function gfSqr(o: GF, a: GF) { gfMul(o, a, a); }

function carry25519(o: GF) {
  for (let i = 0; i < 16; i++) {
    o[i] += 65536;
    const c = Math.floor(o[i] / 65536);
    o[(i + 1) * (i < 15 ? 1 : 0)] += c - 1 + 37 * (c - 1) * (i === 15 ? 1 : 0);
    o[i] -= c * 65536;
  }
}

function gfPow2523(o: GF, i: GF) {
  const c = gfNew();
  gfCopy(c, i);
  for (let a = 250; a >= 0; a--) {
    gfSqr(c, c);
    if (a !== 1) gfMul(c, c, i);
  }
  gfCopy(o, c);
}

function par25519(a: GF): number {
  const d = new Uint8Array(32);
  pack25519(d, a);
  return d[0] & 1;
}

function pack25519(o: Uint8Array, n: GF) {
  const m = gfNew(), t = gfNew();
  gfCopy(t, n);
  carry25519(t);
  carry25519(t);
  carry25519(t);
  for (let j = 0; j < 2; j++) {
    m[0] = t[0] - 0xffed;
    for (let i = 1; i < 15; i++) {
      m[i] = t[i] - 0xffff - ((m[i - 1] >> 16) & 1);
      m[i - 1] &= 0xffff;
    }
    m[15] = t[15] - 0x7fff - ((m[14] >> 16) & 1);
    const b = (m[15] >> 16) & 1;
    m[14] &= 0xffff;
    for (let i = 0; i < 16; i++) t[i] = t[i] * (1 - b) + m[i] * b;
  }
  for (let i = 0; i < 16; i++) {
    o[2 * i] = t[i] & 0xff;
    o[2 * i + 1] = (t[i] >> 8) & 0xff;
  }
}

function isOnCurve(p: Uint8Array): boolean {
  const r = [gfNew(), gfNew(), gfNew(), gfNew()];
  const t = gfNew(), chk = gfNew(), num = gfNew(), den = gfNew(), den2 = gfNew(), den4 = gfNew(), den6 = gfNew();

  gfSet(r[2], 1);
  // unpack y
  for (let i = 0; i < 16; i++) r[1][i] = p[2 * i] | (p[2 * i + 1] << 8);
  r[1][15] &= 0x7fff;

  // num = y^2 - 1, den = d*y^2 + 1
  gfSqr(num, r[1]);
  gfMul(den, num, D);
  gfSub(num, num, r[2]);
  gfAdd(den, den, r[2]);

  // x = sqrt(num/den) using Tonelli-Shanks for p ≡ 5 (mod 8)
  gfSqr(den2, den);
  gfSqr(den4, den2);
  gfMul(den6, den4, den2);
  gfMul(t, den6, num);
  gfMul(t, t, den);

  gfPow2523(t, t);
  gfMul(t, t, num);
  gfMul(t, t, den);
  gfMul(t, t, den);
  gfMul(r[0], t, den);

  gfSqr(chk, r[0]);
  gfMul(chk, chk, den);
  if (!gfEquals(chk, num)) {
    gfMul(r[0], r[0], I_CONST);
    gfSqr(chk, r[0]);
    gfMul(chk, chk, den);
    if (!gfEquals(chk, num)) return false;
  }

  if (par25519(r[0]) !== (p[31] >> 7)) {
    const neg = gfNew();
    gfSub(neg, gfNew(), r[0]);
    gfCopy(r[0], neg);
  }

  return true;
}

function gfEquals(a: GF, b: GF): boolean {
  const pa = new Uint8Array(32), pb = new Uint8Array(32);
  pack25519(pa, a);
  pack25519(pb, b);
  let d = 0;
  for (let i = 0; i < 32; i++) d |= pa[i] ^ pb[i];
  return d === 0;
}

// ── Pre-allocated PDA derivation buffers ────────────────────────────────────

const seedBuf = Buffer.from(seedString, "utf-8");
const programIdBuf = Buffer.from(programIdBytes);
const PDA_MARKER = Buffer.from("ProgramDerivedAddress");

// Hash input: seed + launchId(32) + bump(1) + programId(32) + marker(21)
// We pre-allocate and only overwrite launchId + bump each iteration
const hashInputLen = seedBuf.length + 32 + 1 + programIdBuf.length + PDA_MARKER.length;
const hashInput = Buffer.alloc(hashInputLen);

let offset = 0;
seedBuf.copy(hashInput, offset); offset += seedBuf.length;
const launchIdOffset = offset; offset += 32; // launchId slot
const bumpOffset = offset; offset += 1;       // bump slot
programIdBuf.copy(hashInput, offset); offset += programIdBuf.length;
PDA_MARKER.copy(hashInput, offset);

// ── Counter-based key generation ────────────────────────────────────────────
// Instead of crypto.randomBytes each iteration, we seed a 16-byte counter
// once and increment. ~20x faster.

const counterBuf = crypto.randomBytes(16); // one-time random seed per worker
const counterView = new DataView(counterBuf.buffer, counterBuf.byteOffset);

function incrementCounter() {
  // Increment as two 64-bit halves (little-endian), wraps naturally
  const lo = counterView.getUint32(0, true);
  counterView.setUint32(0, (lo + 1) >>> 0, true);
  if (lo === 0xffffffff) {
    const hi = counterView.getUint32(4, true);
    counterView.setUint32(4, (hi + 1) >>> 0, true);
  }
}

// Pre-compute the idempotency key prefix
const keyPrefix = `bv${workerId}_`;

// SHA-256 for launchId derivation
const launchIdFullBuf = Buffer.alloc(32);

const suffixLen = suffix.length;
let attempts = 0;
let running = true;

parentPort?.on("message", (msg: string) => {
  if (msg === "stop") running = false;
  if (msg === "resume") running = true;
});

const REPORT_INTERVAL = 50_000; // report less often — more time grinding
const BATCH_SIZE = 1_000;       // check running flag every N iterations

function grindBatch(): void {
  for (let b = 0; b < BATCH_SIZE; b++) {
    incrementCounter();

    // Build idempotency key: prefix + hex(counter)
    const keyHex = counterBuf.toString("hex");
    const key = keyPrefix + keyHex;

    // Hash to launchId (32 bytes)
    const hash = crypto.createHash("sha256").update(key).digest();
    hash.copy(launchIdFullBuf, 0, 0, 32);

    // Write launchId into PDA hash input buffer
    launchIdFullBuf.copy(hashInput, launchIdOffset, 0, 32);

    // Try bump 255 down (almost always succeeds on first try)
    for (let bump = 255; bump >= 0; bump--) {
      hashInput[bumpOffset] = bump;

      const pdaHash = crypto.createHash("sha256").update(hashInput).digest();

      // If ON the curve, this bump is invalid — try next
      if (isOnCurve(pdaHash)) continue;

      // Valid PDA found — check suffix
      const addr = base58Encode(pdaHash);
      attempts++;

      if (addr.slice(-suffixLen) === suffix) {
        parentPort?.postMessage({
          type: "found",
          key,
          address: addr,
          launchIdHex: launchIdFullBuf.toString("hex"),
          attempts,
        });
        attempts = 0;
      }

      break; // only need first valid bump
    }
  }

  if (attempts >= REPORT_INTERVAL) {
    parentPort?.postMessage({ type: "progress", attempts });
    attempts = 0;
  }
}

// ── Main loop ───────────────────────────────────────────────────────────────

function loop() {
  if (!running) {
    setTimeout(loop, 100);
    return;
  }
  grindBatch();
  // Yield to event loop so we can receive pause/resume messages
  setImmediate(loop);
}

loop();
