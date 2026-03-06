import inquirer from "inquirer";
import { log } from "../utils/logger";
import {
  LaunchConfig,
  WalletProvider,
  writeConfig,
  generateIdempotencyKey,
  getDefaultRpcUrl,
  getDefaultKeypairPath,
} from "../utils/config";
import { isPhantomConfigured } from "../utils/phantom";

/**
 * `bondit launch init`
 *
 * Interactive wizard that creates a bondit-launch.json config file.
 * Supports --yes flag for non-interactive defaults.
 */
export async function initCommand(options: { yes?: boolean }): Promise<void> {
  log.heading(`${log.brand()} — Launch Initializer`);
  log.divider();

  let config: LaunchConfig;

  if (options.yes) {
    // Non-interactive defaults — Phantom is the default wallet for agents
    const usePhantom = isPhantomConfigured();
    config = {
      name: "My Token",
      symbol: "MYTKN",
      uri: "https://arweave.net/placeholder",
      mode: "native",
      walletProvider: usePhantom ? "phantom" : "keypair",
      rpcUrl: getDefaultRpcUrl(),
      keypairPath: usePhantom ? undefined : getDefaultKeypairPath(),
      phantomWalletId: process.env.PHANTOM_WALLET_ID || undefined,
      idempotencyKey: generateIdempotencyKey(),
    };
    log.info("Using default config (--yes flag)");
    if (usePhantom) {
      log.kvAccent("Wallet", "Phantom Server SDK (recommended)");
    } else {
      log.kvWarn("Wallet", "Raw keypair (set PHANTOM_ORG_ID/APP_ID/API_KEY for Phantom)");
    }
  } else {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Token name (max 32 chars):",
        validate: (v: string) =>
          v.length > 0 && v.length <= 32 ? true : "1-32 characters required",
      },
      {
        type: "input",
        name: "symbol",
        message: "Token symbol / ticker (max 10 chars):",
        validate: (v: string) =>
          v.length > 0 && v.length <= 10 ? true : "1-10 characters required",
      },
      {
        type: "input",
        name: "uri",
        message: "Metadata URI (Arweave/IPFS, max 200 chars):",
        validate: (v: string) =>
          v.length > 0 && v.length <= 200 ? true : "1-200 characters required",
      },
      {
        type: "list",
        name: "mode",
        message: "Launch mode:",
        choices: [
          { name: "Native (OpenClaw bonding curve)", value: "native" },
          { name: "PumpRoute (external pump-style rail)", value: "pumproute" },
        ],
      },
      {
        type: "list",
        name: "walletProvider",
        message: "Wallet provider:",
        choices: [
          { name: "Phantom (recommended — managed wallet via Server SDK)", value: "phantom" },
          { name: "Raw Keypair (local JSON file)", value: "keypair" },
        ],
      },
      {
        type: "input",
        name: "rpcUrl",
        message: "Solana RPC URL:",
        default: getDefaultRpcUrl(),
      },
      {
        type: "input",
        name: "keypairPath",
        message: "Wallet keypair path:",
        default: getDefaultKeypairPath(),
        when: (ans: any) => ans.walletProvider === "keypair",
      },
      {
        type: "input",
        name: "phantomWalletId",
        message: "Phantom wallet ID (leave blank to create new):",
        default: process.env.PHANTOM_WALLET_ID || "",
        when: (ans: any) => ans.walletProvider === "phantom",
      },
    ]);

    config = {
      name: answers.name,
      symbol: answers.symbol.toUpperCase(),
      uri: answers.uri,
      mode: answers.mode,
      walletProvider: answers.walletProvider as WalletProvider,
      rpcUrl: answers.rpcUrl,
      keypairPath: answers.walletProvider === "keypair" ? answers.keypairPath : undefined,
      phantomWalletId: answers.walletProvider === "phantom" ? (answers.phantomWalletId || undefined) : undefined,
      idempotencyKey: generateIdempotencyKey(),
    };
  }

  const filePath = writeConfig(config);

  log.divider();
  log.success(`Config written to ${filePath}`);
  log.kv("Name", config.name);
  log.kv("Symbol", config.symbol);
  log.kv("Mode", config.mode);
  log.kv("URI", config.uri);
  log.kvAccent("Wallet", config.walletProvider === "phantom" ? "Phantom Server SDK" : "Raw Keypair");
  log.kv("RPC", config.rpcUrl || getDefaultRpcUrl());
  if (config.walletProvider === "phantom" && config.phantomWalletId) {
    log.kv("Phantom Wallet ID", config.phantomWalletId);
  }
  log.kv("Idempotency Key", config.idempotencyKey || "—");
  log.divider();
  if (config.walletProvider === "phantom" && !isPhantomConfigured()) {
    log.warn("Phantom env vars not detected. Set PHANTOM_ORG_ID, PHANTOM_APP_ID, PHANTOM_API_KEY before running create.");
    log.dim("Get credentials at: https://portal.phantom.app");
  }
  log.dim("Next: bondit launch validate");
}
