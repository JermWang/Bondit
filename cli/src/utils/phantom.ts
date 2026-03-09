import { PublicKey } from "@solana/web3.js";

// ── Phantom Server SDK Integration ──────────────────────────────────────────
//
// NOTE: @phantom/server-sdk is not yet published on npm.
// This module stubs out the interface so the CLI compiles, but all Phantom
// wallet operations throw a clear "not yet available" error.
//
// When Phantom releases a real server SDK, re-enable this module.
// Until then, use `walletProvider: "keypair"` with a local Solana keypair file.
// ─────────────────────────────────────────────────────────────────────────────

export interface PhantomConfig {
  organizationId: string;
  appId: string;
  apiPrivateKey: string;
  apiBaseUrl?: string;
}

export interface PhantomWallet {
  walletId: string;
  publicKey: PublicKey;
}

const NOT_AVAILABLE =
  "Phantom Server SDK is not yet available.\n" +
  "Use `walletProvider: \"keypair\"` in your bondit-launch.json instead.\n" +
  "Generate a keypair with: solana-keygen new";

export function isPhantomConfigured(): boolean {
  return false;
}

export function getPhantomConfig(): PhantomConfig {
  throw new Error(NOT_AVAILABLE);
}

export async function getOrCreatePhantomWallet(
  _config: PhantomConfig
): Promise<PhantomWallet> {
  throw new Error(NOT_AVAILABLE);
}

export async function phantomSignAndSend(
  _config: PhantomConfig,
  _walletId: string,
  _transaction: unknown,
  _networkId?: string
): Promise<string> {
  throw new Error(NOT_AVAILABLE);
}

export async function phantomSignMessage(
  _config: PhantomConfig,
  _walletId: string,
  _message: string,
  _networkId?: string
): Promise<string> {
  throw new Error(NOT_AVAILABLE);
}
