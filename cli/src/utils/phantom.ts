import { Transaction, PublicKey } from "@solana/web3.js";
import { ServerSDK, NetworkId } from "@phantom/server-sdk";
import { log } from "./logger";

// ── Phantom Server SDK Integration ──────────────────────────────────────────
//
// Uses @phantom/server-sdk for backend wallet management.
// Create an org + app at https://phantom.com/portal/
//
// Required env vars:
//   PHANTOM_ORG_ID     — Organization ID from Phantom Portal
//   PHANTOM_APP_ID     — App ID from Phantom Portal
//   PHANTOM_PRIVATE_KEY — Organization private key (base58)
//   PHANTOM_WALLET_ID  — (optional) Reuse existing wallet
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

// ── Detect if Phantom credentials are configured ────────────────────────────

export function isPhantomConfigured(): boolean {
  return !!(
    process.env.PHANTOM_ORG_ID &&
    process.env.PHANTOM_APP_ID &&
    process.env.PHANTOM_PRIVATE_KEY
  );
}

export function getPhantomConfig(): PhantomConfig {
  const organizationId = process.env.PHANTOM_ORG_ID;
  const appId = process.env.PHANTOM_APP_ID;
  const apiPrivateKey = process.env.PHANTOM_PRIVATE_KEY;

  if (!organizationId || !appId || !apiPrivateKey) {
    throw new Error(
      "Phantom credentials not found.\n" +
        "Set these environment variables:\n" +
        "  PHANTOM_ORG_ID        — Organization ID from Phantom Portal\n" +
        "  PHANTOM_APP_ID        — App ID from Phantom Portal\n" +
        "  PHANTOM_PRIVATE_KEY   — Organization private key (base58)\n\n" +
        "Get your credentials at: https://phantom.com/portal/"
    );
  }

  return {
    organizationId,
    appId,
    apiPrivateKey,
    apiBaseUrl: process.env.PHANTOM_API_URL || "https://api.phantom.app/v1/wallets",
  };
}

// ── Create SDK Instance ─────────────────────────────────────────────────────

function createSDK(config: PhantomConfig): ServerSDK {
  return new ServerSDK({
    organizationId: config.organizationId,
    appId: config.appId,
    apiPrivateKey: config.apiPrivateKey,
    ...(config.apiBaseUrl ? { apiBaseUrl: config.apiBaseUrl } : {}),
  });
}

function getSolanaAddress(addresses: Array<{ addressType: string; address: string }>): string | null {
  const match = addresses.find((entry) => entry.addressType === "Solana");
  return match?.address ?? null;
}

// ── Wallet Operations ───────────────────────────────────────────────────────

export async function getOrCreatePhantomWallet(
  config: PhantomConfig
): Promise<PhantomWallet> {
  const sdk = createSDK(config);
  const existingWalletId = process.env.PHANTOM_WALLET_ID;

  if (existingWalletId) {
    log.info(`Using existing Phantom wallet: ${existingWalletId.slice(0, 12)}...`);

    // Fetch addresses for this wallet via getWalletAddresses
    const addresses = await sdk.getWalletAddresses(existingWalletId);

    const solanaAddr = addresses.find((a) => String(a.addressType) === "Solana");
    if (!solanaAddr) {
      throw new Error(`Phantom wallet ${existingWalletId} has no Solana address.`);
    }

    return {
      walletId: existingWalletId,
      publicKey: new PublicKey(solanaAddr.address),
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

export async function phantomSignAndSend(
  config: PhantomConfig,
  walletId: string,
  transaction: Transaction,
  networkId?: string
): Promise<string> {
  const sdk = createSDK(config);

  const resolvedNetworkId = networkId === "solana:mainnet"
    ? NetworkId.SOLANA_MAINNET
    : networkId === "solana:testnet"
      ? NetworkId.SOLANA_TESTNET
      : NetworkId.SOLANA_DEVNET;

  const result = await sdk.signAndSendTransaction({
    walletId,
    transaction,
    networkId: resolvedNetworkId,
  });

  return (result as any).hash || (result as any).signature || "";
}

export async function phantomSignMessage(
  config: PhantomConfig,
  walletId: string,
  message: string,
  networkId?: string
): Promise<string> {
  const sdk = createSDK(config);

  const resolvedNetworkId = networkId === "solana:mainnet"
    ? NetworkId.SOLANA_MAINNET
    : NetworkId.SOLANA_DEVNET;

  const result = await sdk.signMessage({
    walletId,
    message,
    networkId: resolvedNetworkId,
  });

  return (result as any).signature || "";
}
