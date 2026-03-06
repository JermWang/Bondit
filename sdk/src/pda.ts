import { PublicKey } from "@solana/web3.js";
import {
  LAUNCH_FACTORY_PROGRAM_ID,
  BONDING_CURVE_PROGRAM_ID,
  AGENCY_VAULTS_PROGRAM_ID,
  POLICY_ENGINE_PROGRAM_ID,
  VENUE_ADAPTERS_PROGRAM_ID,
  SEEDS,
} from "./constants";

export function deriveLaunchState(launchId: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.LAUNCH_STATE, launchId],
    LAUNCH_FACTORY_PROGRAM_ID
  );
}

export function deriveTokenMint(launchId: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.TOKEN_MINT, launchId],
    LAUNCH_FACTORY_PROGRAM_ID
  );
}

export function deriveCurveState(launchId: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.CURVE_STATE, launchId],
    BONDING_CURVE_PROGRAM_ID
  );
}

export function deriveSolVault(launchId: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.SOL_VAULT, launchId],
    BONDING_CURVE_PROGRAM_ID
  );
}

export function deriveVaultState(launchId: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.VAULT_STATE, launchId],
    AGENCY_VAULTS_PROGRAM_ID
  );
}

export function derivePolicyState(launchId: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.POLICY_STATE, launchId],
    POLICY_ENGINE_PROGRAM_ID
  );
}

export function deriveAdapterState(launchId: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.ADAPTER_STATE, launchId],
    VENUE_ADAPTERS_PROGRAM_ID
  );
}

/** Derive all PDAs for a launch given a 32-byte launch ID */
export function deriveAllPDAs(launchId: Buffer) {
  const [launchState, launchStateBump] = deriveLaunchState(launchId);
  const [tokenMint, tokenMintBump] = deriveTokenMint(launchId);
  const [curveState, curveStateBump] = deriveCurveState(launchId);
  const [solVault, solVaultBump] = deriveSolVault(launchId);
  const [vaultState, vaultStateBump] = deriveVaultState(launchId);
  const [policyState, policyStateBump] = derivePolicyState(launchId);
  const [adapterState, adapterStateBump] = deriveAdapterState(launchId);

  return {
    launchState: { address: launchState, bump: launchStateBump },
    tokenMint: { address: tokenMint, bump: tokenMintBump },
    curveState: { address: curveState, bump: curveStateBump },
    solVault: { address: solVault, bump: solVaultBump },
    vaultState: { address: vaultState, bump: vaultStateBump },
    policyState: { address: policyState, bump: policyStateBump },
    adapterState: { address: adapterState, bump: adapterStateBump },
  };
}
