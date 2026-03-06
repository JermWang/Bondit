import { Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ── Launch Config Schema ────────────────────────────────────────────────────

export type WalletProvider = "phantom" | "keypair";

export interface LaunchConfig {
  name: string;
  symbol: string;
  uri: string;
  mode: "native" | "pumproute";
  walletProvider: WalletProvider;
  rpcUrl?: string;
  keypairPath?: string;
  phantomWalletId?: string;
  idempotencyKey?: string;
}

export const CONFIG_FILENAME = "bondit-launch.json";

// ── Defaults ────────────────────────────────────────────────────────────────

export function getDefaultRpcUrl(): string {
  return process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
}

export function getDefaultKeypairPath(): string {
  return (
    process.env.BONDIT_KEYPAIR_PATH ||
    process.env.SOLANA_KEYPAIR_PATH ||
    path.join(os.homedir(), ".config", "solana", "id.json")
  );
}

// ── Keypair Loading ─────────────────────────────────────────────────────────

export function loadKeypair(keypairPath?: string): Keypair {
  const resolved = keypairPath || getDefaultKeypairPath();

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Keypair not found at ${resolved}\n` +
        `Set BONDIT_KEYPAIR_PATH or SOLANA_KEYPAIR_PATH, ` +
        `or generate one with: solana-keygen new`
    );
  }

  const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

// ── Connection ──────────────────────────────────────────────────────────────

export function createConnection(rpcUrl?: string): Connection {
  return new Connection(rpcUrl || getDefaultRpcUrl(), "confirmed");
}

// ── Config File I/O ─────────────────────────────────────────────────────────

export function writeConfig(config: LaunchConfig, dir: string = "."): string {
  const filePath = path.join(dir, CONFIG_FILENAME);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  return filePath;
}

export function readConfig(dir: string = "."): LaunchConfig {
  const filePath = path.join(dir, CONFIG_FILENAME);

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No ${CONFIG_FILENAME} found in ${path.resolve(dir)}\n` +
        `Run \`bondit launch init\` first to create one.`
    );
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return raw as LaunchConfig;
}

// ── Idempotency ─────────────────────────────────────────────────────────────

export function generateIdempotencyKey(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `bondit_${ts}_${rand}`;
}
