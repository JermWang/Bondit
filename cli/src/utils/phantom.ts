import { Transaction, PublicKey, Connection } from "@solana/web3.js";
import { log } from "./logger";

type PhantomNetworkId = import("@phantom/server-sdk").NetworkId;

const PHANTOM_SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" as PhantomNetworkId;
const PHANTOM_SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as PhantomNetworkId;
const PHANTOM_SOLANA_TESTNET = "solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z" as PhantomNetworkId;

// ── Phantom Server SDK Integration ──────────────────────────────────────────
//
// The @phantom/server-sdk is the official Phantom wallet SDK for backend/CLI
// applications. It allows agents and CLI users to:
//   1. Create managed wallets via Phantom's infrastructure
//   2. Sign and send Solana transactions through Phantom
//   3. Authenticate via organization API keys (not raw keypair files)
//
// This is the RECOMMENDED wallet provider for BondIt CLI agent launches.
//
// Required env vars:
//   PHANTOM_ORG_ID       — Phantom Portal organization ID
//   PHANTOM_APP_ID       — Phantom Portal app ID
//   PHANTOM_API_KEY      — API private key from Phantom Portal
//   PHANTOM_WALLET_ID    — (optional) Reuse existing wallet, else creates new
//
// Get credentials at: https://portal.phantom.app
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

function resolveNetworkId(networkId?: string): PhantomNetworkId {
  switch (networkId) {
    case undefined:
    case "solana:devnet":
      return PHANTOM_SOLANA_DEVNET;
    case "solana:mainnet":
      return PHANTOM_SOLANA_MAINNET;
    case "solana:testnet":
      return PHANTOM_SOLANA_TESTNET;
    default:
      return networkId as PhantomNetworkId;
  }
}

function getSolanaAddress(addresses: Array<{ addressType: string; address: string }>): string | null {
  const match = addresses.find((entry) => entry.addressType.toLowerCase().includes("solana"));
  return match?.address ?? null;
}

// ── Detect if Phantom credentials are configured ────────────────────────────

export function isPhantomConfigured(): boolean {
  return !!(
    process.env.PHANTOM_ORG_ID &&
    process.env.PHANTOM_APP_ID &&
    process.env.PHANTOM_API_KEY
  );
}

export function getPhantomConfig(): PhantomConfig {
  const organizationId = process.env.PHANTOM_ORG_ID;
  const appId = process.env.PHANTOM_APP_ID;
  const apiPrivateKey = process.env.PHANTOM_API_KEY;

  if (!organizationId || !appId || !apiPrivateKey) {
    throw new Error(
      "Phantom credentials not found.\n" +
        "Set these environment variables:\n" +
        "  PHANTOM_ORG_ID       — Organization ID from Phantom Portal\n" +
        "  PHANTOM_APP_ID       — App ID from Phantom Portal\n" +
        "  PHANTOM_API_KEY      — API private key from Phantom Portal\n\n" +
        "Get your credentials at: https://portal.phantom.app"
    );
  }

  return {
    organizationId,
    appId,
    apiPrivateKey,
    apiBaseUrl: process.env.PHANTOM_API_URL || undefined,
  };
}

// ── Create SDK Instance ─────────────────────────────────────────────────────

async function createServerSDK(config: PhantomConfig) {
  // Dynamic import to keep the dependency optional at runtime
  const { ServerSDK } = await import("@phantom/server-sdk");

  const sdkConfig: any = {
    organizationId: config.organizationId,
    appId: config.appId,
    apiPrivateKey: config.apiPrivateKey,
  };

  if (config.apiBaseUrl) {
    sdkConfig.apiBaseUrl = config.apiBaseUrl;
  }

  return new ServerSDK(sdkConfig);
}

// ── Wallet Operations ───────────────────────────────────────────────────────

/**
 * Get or create a Phantom-managed wallet for the CLI session.
 * If PHANTOM_WALLET_ID is set, reuses that wallet.
 * Otherwise creates a new one labeled "BondIt CLI Agent".
 */
export async function getOrCreatePhantomWallet(
  config: PhantomConfig
): Promise<PhantomWallet> {
  const sdk = await createServerSDK(config);
  const existingWalletId = process.env.PHANTOM_WALLET_ID;

  if (existingWalletId) {
    log.info(`Using existing Phantom wallet: ${existingWalletId.slice(0, 12)}...`);

    const addresses = await sdk.getWalletAddresses(existingWalletId);
    const solanaAddress = getSolanaAddress(addresses);

    if (!solanaAddress) {
      throw new Error(
        `Phantom wallet ${existingWalletId} has no Solana address. ` +
          "Create a new wallet with Solana support or check your wallet ID."
      );
    }

    return {
      walletId: existingWalletId,
      publicKey: new PublicKey(solanaAddress),
    };
  }

  // Create new wallet
  log.info("Creating new Phantom-managed wallet for BondIt CLI...");
  const wallet = await sdk.createWallet("BondIt CLI Agent");

  const solanaAddress = getSolanaAddress(wallet.addresses);

  if (!solanaAddress) {
    throw new Error("Newly created Phantom wallet missing Solana address.");
  }

  const publicKey = new PublicKey(solanaAddress);

  log.success("Phantom wallet created");
  log.kv("Wallet ID", wallet.walletId);
  log.kv("Solana Address", publicKey.toBase58());
  log.dim("Save PHANTOM_WALLET_ID to reuse this wallet:");
  log.dim(`  export PHANTOM_WALLET_ID="${wallet.walletId}"`);

  return {
    walletId: wallet.walletId,
    publicKey,
  };
}

/**
 * Sign and send a transaction via Phantom Server SDK.
 * Uses Phantom's simulation + security layer before broadcasting.
 */
export async function phantomSignAndSend(
  config: PhantomConfig,
  walletId: string,
  transaction: Transaction,
  networkId?: string
): Promise<string> {
  const sdk = await createServerSDK(config);

  const result = await sdk.signAndSendTransaction({
    walletId,
    transaction,
    networkId: resolveNetworkId(networkId),
  });

  return result.hash || "";
}

/**
 * Sign a message via Phantom Server SDK.
 * Useful for identity verification / off-chain attestation.
 */
export async function phantomSignMessage(
  config: PhantomConfig,
  walletId: string,
  message: string,
  networkId?: string
): Promise<string> {
  const sdk = await createServerSDK(config);

  const result = await sdk.signMessage({
    walletId,
    message,
    networkId: resolveNetworkId(networkId),
  });

  return result.signature || "";
}
