import crypto from "crypto";
import ora from "ora";
import { Keypair, Transaction, TransactionInstruction, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  LAUNCH_FACTORY_PROGRAM_ID,
  deriveAllPDAs,
  LaunchMode,
} from "@bondit/sdk";
import { log } from "../utils/logger";
import { readConfig, loadKeypair, createConnection } from "../utils/config";
import { simulateTransaction } from "../utils/tx";
import {
  isPhantomConfigured,
  getPhantomConfig,
  getOrCreatePhantomWallet,
} from "../utils/phantom";

/**
 * `bondit launch simulate`
 *
 * Builds the create_launch transaction and runs RPC simulation
 * WITHOUT submitting. Reports compute units, logs, and any errors.
 */
export async function simulateCommand(): Promise<boolean> {
  log.heading(`${log.brand()} — Launch Simulator`);
  log.divider();

  const config = readConfig();
  const spinner = ora("Building transaction...").start();

  try {
    const connection = createConnection(config.rpcUrl);
    const usePhantom = (config.walletProvider || "keypair") === "phantom";

    // Resolve wallet public key for tx construction
    let payerPublicKey: PublicKey;
    let signerKeypair: Keypair | undefined;

    if (usePhantom) {
      if (!isPhantomConfigured()) {
        spinner.stop();
        log.error("Phantom credentials not configured.");
        log.dim("Set PHANTOM_ORG_ID, PHANTOM_APP_ID, PHANTOM_API_KEY env vars.");
        return false;
      }
      const phantomConfig = getPhantomConfig();
      spinner.text = "Resolving Phantom wallet for simulation...";
      const wallet = await getOrCreatePhantomWallet(phantomConfig);
      payerPublicKey = wallet.publicKey;
      log.kvAccent("Wallet", `Phantom (${wallet.walletId.slice(0, 12)}...)`);
      // For RPC simulation we need a signer — use an ephemeral keypair since
      // simulation doesn't actually broadcast. The feePayer is set to the real key.
      signerKeypair = Keypair.generate();
    } else {
      const payer = loadKeypair(config.keypairPath);
      payerPublicKey = payer.publicKey;
      signerKeypair = payer;
    }

    // Derive launch ID from idempotency key
    const launchIdBuf = crypto
      .createHash("sha256")
      .update(config.idempotencyKey || `${config.symbol}_${Date.now()}`)
      .digest();
    const launchId = launchIdBuf.slice(0, 32);

    // Derive all PDAs
    const pdas = deriveAllPDAs(Buffer.from(launchId));

    // Resolve ATAs for vaults
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

    // Build instruction data (Anchor discriminator + args)
    const modeValue = config.mode === "native" ? LaunchMode.Native : LaunchMode.PumpRoute;
    const discriminator = Buffer.from(
      crypto.createHash("sha256").update("global:create_launch").digest().slice(0, 8)
    );

    // Encode args: launch_id (32 bytes) + name (4+len) + symbol (4+len) + uri (4+len) + mode (1)
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

    spinner.text = "Simulating on RPC...";
    // For Phantom wallets we simulate with replaceRecentBlockhash + sigVerify disabled
    tx.feePayer = payerPublicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const result = usePhantom
      ? await (async () => {
          const sim = await connection.simulateTransaction(tx, undefined, undefined);
          return {
            success: sim.value.err === null,
            logs: sim.value.logs ?? [],
            unitsConsumed: sim.value.unitsConsumed ?? 0,
          };
        })()
      : await simulateTransaction(connection, tx, signerKeypair!);

    spinner.stop();
    log.divider();

    if (result.success) {
      log.success("Simulation passed");
      log.kv("Compute units", result.unitsConsumed.toLocaleString());
    } else {
      log.error("Simulation failed");
    }

    // Print key addresses
    log.heading("Derived Accounts");
    log.kv("Launch State", pdas.launchState.address.toBase58());
    log.kv("Token Mint", pdas.tokenMint.address.toBase58());
    log.kv("Curve State", pdas.curveState.address.toBase58());
    log.kv("Vault State", pdas.vaultState.address.toBase58());
    log.kv("Curve Vault", curveTokenVault.toBase58());
    log.kv("Treasury Vault", treasuryVault.toBase58());
    log.kv("LP Reserve Vault", lpReserveVault.toBase58());

    if (result.logs.length > 0) {
      log.heading("Program Logs");
      for (const line of result.logs.slice(0, 20)) {
        log.dim(`  ${line}`);
      }
      if (result.logs.length > 20) {
        log.dim(`  ... (${result.logs.length - 20} more lines)`);
      }
    }

    log.divider();
    if (result.success) {
      log.dim("Next: bondit launch create");
    }

    return result.success;
  } catch (err) {
    spinner.stop();
    log.error((err as Error).message);
    return false;
  }
}
