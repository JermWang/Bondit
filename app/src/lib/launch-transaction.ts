import { Buffer } from "buffer";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { LAUNCH_FACTORY_PROGRAM_ID, LaunchMode, deriveAllPDAs } from "@bondit/sdk";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

export interface LaunchTransactionInput {
  creator: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  mode: "native" | "pumproute";
  idempotencyKey?: string;
}

export interface LaunchTransactionBuildResult {
  curveTokenVault: PublicKey;
  launchId: Buffer;
  launchIdHex: string;
  lpReserveVault: PublicKey;
  pdas: ReturnType<typeof deriveAllPDAs>;
  transaction: Transaction;
  treasuryVault: PublicKey;
}

async function deriveLaunchId(idempotencySource: string): Promise<Buffer> {
  const encoded = new TextEncoder().encode(idempotencySource);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return Buffer.from(new Uint8Array(digest).slice(0, 32));
}

export async function buildCreateLaunchTransaction(
  input: LaunchTransactionInput,
): Promise<LaunchTransactionBuildResult> {
  const launchId = await deriveLaunchId(
    input.idempotencyKey?.trim() || `${input.symbol}_${Date.now()}`,
  );
  const pdas = deriveAllPDAs(launchId);

  const [curveTokenVault] = PublicKey.findProgramAddressSync(
    [
      pdas.curveState.address.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      pdas.tokenMint.address.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const [treasuryVault] = PublicKey.findProgramAddressSync(
    [
      pdas.vaultState.address.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      pdas.tokenMint.address.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const [lpReserveVault] = PublicKey.findProgramAddressSync(
    [
      pdas.vaultState.address.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      pdas.tokenMint.address.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const modeValue = input.mode === "native" ? LaunchMode.Native : LaunchMode.PumpRoute;
  const discriminator = Buffer.from(
    await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("global:create_launch"),
    ),
  ).slice(0, 8);

  const nameBytes = Buffer.from(input.name, "utf-8");
  const symbolBytes = Buffer.from(input.symbol, "utf-8");
  const uriBytes = Buffer.from(input.uri, "utf-8");

  const dataLen =
    8 + 32 + (4 + nameBytes.length) + (4 + symbolBytes.length) + (4 + uriBytes.length) + 1;
  const data = Buffer.alloc(dataLen);
  let offset = 0;

  discriminator.copy(data, offset);
  offset += 8;
  launchId.copy(data, offset);
  offset += 32;

  data.writeUInt32LE(nameBytes.length, offset);
  offset += 4;
  nameBytes.copy(data, offset);
  offset += nameBytes.length;

  data.writeUInt32LE(symbolBytes.length, offset);
  offset += 4;
  symbolBytes.copy(data, offset);
  offset += symbolBytes.length;

  data.writeUInt32LE(uriBytes.length, offset);
  offset += 4;
  uriBytes.copy(data, offset);
  offset += uriBytes.length;

  data.writeUInt8(modeValue, offset);

  const instruction = new TransactionInstruction({
    programId: LAUNCH_FACTORY_PROGRAM_ID,
    keys: [
      { pubkey: input.creator, isSigner: true, isWritable: true },
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

  return {
    curveTokenVault,
    launchId,
    launchIdHex: launchId.toString("hex"),
    lpReserveVault,
    pdas,
    transaction: new Transaction().add(instruction),
    treasuryVault,
  };
}
