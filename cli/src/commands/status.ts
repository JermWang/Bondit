import ora from "ora";
import { PublicKey } from "@solana/web3.js";
import {
  LAUNCH_FACTORY_PROGRAM_ID,
  deriveLaunchState,
  deriveTokenMint,
  LaunchStatus,
} from "@bondit/sdk";
import { log } from "../utils/logger";
import { createConnection, getDefaultRpcUrl } from "../utils/config";

/**
 * `bondit launch status <launchId>`
 *
 * Fetches on-chain launch state and displays current status, addresses, and metrics.
 * Accepts either a hex launch ID or a base58 launch state address.
 */
export async function statusCommand(
  launchIdOrAddress: string,
  options: { rpc?: string }
): Promise<void> {
  log.heading(`${log.brand()} — Launch Status`);
  log.divider();

  const spinner = ora("Fetching launch state...").start();

  try {
    const rpcUrl = options.rpc || getDefaultRpcUrl();
    const connection = createConnection(rpcUrl);

    let launchStatePubkey: PublicKey;

    // Determine if input is hex launchId or base58 address
    if (launchIdOrAddress.length === 64 && /^[0-9a-fA-F]+$/.test(launchIdOrAddress)) {
      // Hex launch ID → derive PDA
      const launchIdBuf = Buffer.from(launchIdOrAddress, "hex");
      const [derived] = deriveLaunchState(launchIdBuf);
      launchStatePubkey = derived;
    } else if (launchIdOrAddress.length < 64) {
      // Partial hex ID — pad/hash or treat as error
      spinner.stop();
      log.error("Provide the full 64-char hex launch ID or a base58 launch state address.");
      return;
    } else {
      // Try as base58
      try {
        launchStatePubkey = new PublicKey(launchIdOrAddress);
      } catch {
        spinner.stop();
        log.error("Invalid launch ID or address format.");
        return;
      }
    }

    const accountInfo = await connection.getAccountInfo(launchStatePubkey);

    if (!accountInfo) {
      spinner.stop();
      log.error("Launch state account not found on-chain.");
      log.kv("Address", launchStatePubkey.toBase58());
      log.dim("This launch may not exist yet, or you may be on the wrong cluster.");
      return;
    }

    // Detect cluster
    const cluster = rpcUrl.includes("devnet") ? "devnet" : rpcUrl.includes("testnet") ? "testnet" : "mainnet-beta";

    spinner.text = "Decoding account data...";

    // Parse the account data (Anchor account layout)
    // 8 byte discriminator + account fields
    const data = accountInfo.data;

    if (data.length < 8 + 32) {
      spinner.stop();
      log.error("Account data too small — may not be a valid LaunchState.");
      return;
    }

    // Skip 8-byte discriminator
    let offset = 8;

    // launch_id: [u8; 32]
    const launchIdBytes = data.slice(offset, offset + 32);
    offset += 32;

    // creator: Pubkey
    const creator = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // mint: Pubkey
    const mint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // launch_mode: u8
    const launchMode = data.readUInt8(offset);
    offset += 1;

    // curve_state: Pubkey
    const curveState = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // vault_state: Pubkey
    const vaultState = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // policy_state: Pubkey
    const policyState = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // adapter_state: Pubkey
    const adapterState = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // curve_token_vault: Pubkey
    const curveTokenVault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // treasury_vault: Pubkey
    const treasuryVault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // lp_reserve_vault: Pubkey
    const lpReserveVault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // status: u8
    const statusByte = data.readUInt8(offset);
    offset += 1;

    // created_at: i64
    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    // graduated_at: i64
    const graduatedAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    // flight_mode_at: i64
    const flightModeAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    // name: String (4-byte len + bytes)
    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLen).toString("utf-8");
    offset += nameLen;

    // symbol: String
    const symbolLen = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLen).toString("utf-8");

    // Status label
    const statusLabels: Record<number, string> = {
      0: "CurveActive",
      1: "Stewarding",
      2: "FlightMode",
    };
    const statusLabel = statusLabels[statusByte] ?? `Unknown(${statusByte})`;

    spinner.stop();

    // Display
    log.heading("Token Info");
    log.kvAccent("Name", name);
    log.kvAccent("Symbol", `$${symbol}`);
    log.kv("Mode", launchMode === 0 ? "Native" : "PumpRoute");

    log.heading("Status");
    const statusColor = statusByte === 0 ? log.kvAccent : statusByte === 1 ? log.kv : log.kvWarn;
    statusColor("Phase", statusLabel);
    log.kv("Created", createdAt > 0 ? new Date(createdAt * 1000).toISOString() : "—");
    log.kv("Graduated", graduatedAt > 0 ? new Date(graduatedAt * 1000).toISOString() : "—");
    log.kv("Flight Mode", flightModeAt > 0 ? new Date(flightModeAt * 1000).toISOString() : "—");

    log.heading("Addresses");
    log.kv("Launch State", launchStatePubkey.toBase58());
    log.kv("Creator", creator.toBase58());
    log.kv("Mint", mint.toBase58());
    log.kv("Curve State", curveState.toBase58());
    log.kv("Vault State", vaultState.toBase58());
    log.kv("Policy State", policyState.toBase58());
    log.kv("Adapter State", adapterState.toBase58());

    log.heading("Vault Accounts");
    log.kv("Curve Token Vault", curveTokenVault.toBase58());
    log.kv("Treasury Vault", treasuryVault.toBase58());
    log.kv("LP Reserve Vault", lpReserveVault.toBase58());

    log.heading("Launch ID");
    log.dim(`  ${launchIdBytes.toString("hex")}`);

    log.heading("Explorer");
    log.explorerAccount(launchStatePubkey.toBase58(), cluster);
    log.explorerAccount(mint.toBase58(), cluster);

    log.divider();

    // Supply snapshot if possible
    try {
      const mintSupply = await connection.getTokenSupply(mint);
      log.kv("Total Supply", `${Number(mintSupply.value.amount) / 1e6} tokens`);
    } catch {
      log.dim("  (Could not fetch token supply)");
    }
  } catch (err) {
    spinner.stop();
    log.error((err as Error).message);
    process.exitCode = 1;
  }
}
