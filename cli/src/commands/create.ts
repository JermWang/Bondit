import crypto from "crypto";
import ora from "ora";
import { Transaction, TransactionInstruction, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  LAUNCH_FACTORY_PROGRAM_ID,
  deriveAllPDAs,
  LaunchMode,
} from "@bondit/sdk";
import { log } from "../utils/logger";
import { readConfig, loadKeypair, createConnection, writeConfig } from "../utils/config";
import { runVanitySearch } from "./vanity";
import { sendWithRetry } from "../utils/tx";
import {
  isPhantomConfigured,
  getPhantomConfig,
  getOrCreatePhantomWallet,
  phantomSignAndSend,
} from "../utils/phantom";

/**
 * `bondit launch create`
 *
 * Builds, signs, and submits the create_launch transaction to Solana.
 * Uses retry policy with idempotency guard.
 */
export async function createCommand(options: { skipSimulate?: boolean; noVanity?: boolean; vanitySuffix?: string }): Promise<void> {
  log.heading(`${log.brand()} — Launch Creator`);
  log.divider();

  const config = readConfig();
  let spinner = ora("Preparing launch transaction...").start();

  try {
    const connection = createConnection(config.rpcUrl);
    const usePhantom = (config.walletProvider || "keypair") === "phantom";

    // ── Resolve wallet (Phantom or raw keypair) ─────────────────────────
    let payerPublicKey: PublicKey;
    let phantomWalletId: string | undefined;
    let phantomConfig: ReturnType<typeof getPhantomConfig> | undefined;
    let payer: ReturnType<typeof loadKeypair> | undefined;

    if (usePhantom) {
      if (!isPhantomConfigured()) {
        spinner.stop();
        log.error("Phantom credentials not configured.");
        log.dim("Set PHANTOM_ORG_ID, PHANTOM_APP_ID, PHANTOM_API_KEY env vars.");
        log.dim("Get credentials at: https://portal.phantom.app");
        return;
      }
      phantomConfig = getPhantomConfig();
      spinner.text = "Connecting to Phantom wallet...";
      const wallet = await getOrCreatePhantomWallet(phantomConfig);
      payerPublicKey = wallet.publicKey;
      phantomWalletId = wallet.walletId;
      log.kvAccent("Wallet", `Phantom (${phantomWalletId.slice(0, 12)}...)`);
    } else {
      payer = loadKeypair(config.keypairPath);
      payerPublicKey = payer.publicKey;
    }

    // Balance check
    const balance = await connection.getBalance(payerPublicKey);
    const balanceSol = balance / 1e9;
    if (balanceSol < 0.05) {
      spinner.stop();
      log.error(`Insufficient balance: ${balanceSol.toFixed(4)} SOL (need ~0.05 SOL for rent + fees)`);
      log.dim("Fund your wallet or switch to devnet: solana airdrop 2");
      return;
    }

    // Always grind for a vanity mint address unless --no-vanity
    let idempotencyKey = config.idempotencyKey;
    const suffix = options.vanitySuffix || "LoL";

    if (!options.noVanity) {
      spinner.text = "Claiming vanity key from backlog...";

      // Try the backlog API first (instant)
      let claimed = false;
      const indexerUrl = config.rpcUrl?.includes("mainnet")
        ? process.env.INDEXER_API_URL
        : process.env.INDEXER_API_URL || "http://localhost:4000";

      if (indexerUrl) {
        try {
          const resp = await fetch(`${indexerUrl}/api/vanity/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ suffix, claimedBy: payerPublicKey.toBase58() }),
            signal: AbortSignal.timeout(5000),
          });
          if (resp.ok) {
            const data = await resp.json() as { idempotencyKey: string; mintAddress: string };
            idempotencyKey = data.idempotencyKey;
            claimed = true;
            spinner.stop();
            log.success(`Claimed vanity key from backlog → mint ends with ${suffix}`);
            log.kv("Mint Address", data.mintAddress);
          }
        } catch {
          // Backlog unavailable — fall through to local grind
        }
      }

      // Fall back to local grind if backlog was empty or unavailable
      if (!claimed) {
        spinner.stop();
        log.info(`Backlog unavailable — grinding locally (suffix: ${suffix})`);
        const vanityResult = await runVanitySearch({
          suffix,
          target: "mint",
        });
        if (!vanityResult) {
          log.error("Vanity search failed. Aborting launch.");
          return;
        }
        idempotencyKey = vanityResult.idempotencyKey;
      }

      config.idempotencyKey = idempotencyKey;
      writeConfig(config);
      spinner = ora("Preparing launch transaction...").start();
    }

    // Derive launch ID from idempotency key
    const launchIdBuf = crypto
      .createHash("sha256")
      .update(idempotencyKey || `${config.symbol}_${Date.now()}`)
      .digest();
    const launchId = launchIdBuf.slice(0, 32);

    // Check if launch already exists (idempotency guard)
    const pdas = deriveAllPDAs(Buffer.from(launchId));
    const existing = await connection.getAccountInfo(pdas.launchState.address);
    if (existing) {
      spinner.stop();
      log.warn("Launch already exists for this idempotency key.");
      log.kv("Launch State", pdas.launchState.address.toBase58());
      log.kv("Token Mint", pdas.tokenMint.address.toBase58());
      log.dim("To create a new launch, run `bondit launch init` for a fresh config.");
      return;
    }

    // Resolve ATAs
    const [curveTokenVault] = PublicKey.findProgramAddressSync(
      [pdas.curveState.address.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), pdas.tokenMint.address.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const [treasuryVault] = PublicKey.findProgramAddressSync(
      [pdas.vaultState.address.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), pdas.tokenMint.address.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const [lpReserveVault] = PublicKey.findProgramAddressSync(
      [pdas.vaultState.address.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), pdas.tokenMint.address.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Build instruction data
    const modeValue = config.mode === "native" ? LaunchMode.Native : LaunchMode.PumpRoute;
    const discriminator = Buffer.from(
      crypto.createHash("sha256").update("global:create_launch").digest().slice(0, 8)
    );

    const nameBytes = Buffer.from(config.name, "utf-8");
    const symbolBytes = Buffer.from(config.symbol, "utf-8");
    const uriBytes = Buffer.from(config.uri, "utf-8");

    const dataLen = 8 + 32 + (4 + nameBytes.length) + (4 + symbolBytes.length) + (4 + uriBytes.length) + 1;
    const data = Buffer.alloc(dataLen);
    let offset = 0;

    discriminator.copy(data, offset); offset += 8;
    launchId.copy(data, offset); offset += 32;

    data.writeUInt32LE(nameBytes.length, offset); offset += 4;
    nameBytes.copy(data, offset); offset += nameBytes.length;

    data.writeUInt32LE(symbolBytes.length, offset); offset += 4;
    symbolBytes.copy(data, offset); offset += symbolBytes.length;

    data.writeUInt32LE(uriBytes.length, offset); offset += 4;
    uriBytes.copy(data, offset); offset += uriBytes.length;

    data.writeUInt8(modeValue, offset);

    const ix = new TransactionInstruction({
      programId: LAUNCH_FACTORY_PROGRAM_ID,
      keys: [
        { pubkey: payerPublicKey, isSigner: true, isWritable: true },
        { pubkey: pdas.launchState.address, isSigner: false, isWritable: true },
        { pubkey: pdas.tokenMint.address, isSigner: false, isWritable: true },
        { pubkey: pdas.curveState.address, isSigner: false, isWritable: false },
        { pubkey: pdas.vaultState.address, isSigner: false, isWritable: false },
        { pubkey: curveTokenVault, isSigner: false, isWritable: true },
        { pubkey: treasuryVault, isSigner: false, isWritable: true },
        { pubkey: lpReserveVault, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);

    // Detect cluster for explorer links
    const rpc = config.rpcUrl || "";
    const cluster = rpc.includes("devnet") ? "devnet" : rpc.includes("testnet") ? "testnet" : "mainnet-beta";

    spinner.text = usePhantom ? "Signing via Phantom..." : "Signing and submitting...";
    let sig: string;

    if (usePhantom && phantomConfig && phantomWalletId) {
      // Phantom Server SDK handles signing + simulation + broadcast
      const rpc = config.rpcUrl || "";
      const networkId = rpc.includes("mainnet")
        ? "solana:mainnet"
        : rpc.includes("testnet")
          ? "solana:testnet"
          : "solana:devnet";

      tx.feePayer = payerPublicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      sig = await phantomSignAndSend(phantomConfig, phantomWalletId, tx, networkId);
    } else if (payer) {
      sig = await sendWithRetry(connection, tx, [payer], "create_launch");
    } else {
      throw new Error("No wallet available for signing.");
    }

    spinner.stop();
    log.rocket();
    log.launchSuccess();
    log.divider();

    log.heading("Launch Details");
    log.kv("Name", config.name);
    log.kvAccent("Symbol", `$${config.symbol}`);
    log.kv("Mode", config.mode);
    log.kv("Creator", payerPublicKey.toBase58());
    if (usePhantom) {
      log.kvAccent("Signed via", "Phantom Server SDK");
    }
    log.kv("Balance after", `${((await connection.getBalance(payerPublicKey)) / 1e9).toFixed(4)} SOL`);

    log.heading("On-Chain Addresses");
    log.kv("Launch State", pdas.launchState.address.toBase58());
    log.kv("Token Mint", pdas.tokenMint.address.toBase58());
    log.kv("Curve State", pdas.curveState.address.toBase58());
    log.kv("Vault State", pdas.vaultState.address.toBase58());

    log.heading("Transaction");
    log.kvAccent("Signature", sig);
    log.explorer(sig, cluster);
    log.explorerAccount(pdas.tokenMint.address.toBase58(), cluster);

    log.divider();
    log.dim("Supply: 1B total → 800M curve / 150M treasury / 50M LP reserve");
    log.dim("Status: CurveActive — bonding curve is now live.");
    log.dim("Next: bondit launch status " + launchId.toString("hex").slice(0, 16));
  } catch (err) {
    spinner.stop();
    log.error((err as Error).message);
    process.exitCode = 1;
  }
}
