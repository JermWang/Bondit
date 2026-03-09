#!/usr/bin/env ts-node
/**
 * Phantom Server SDK — One-Time Organization Setup
 *
 * The Portal (phantom.com/portal) only gives you the App ID.
 * The Server SDK needs an Organization + Private Key, which you
 * create programmatically with this script.
 *
 * Run once:  npx ts-node src/phantom-setup.ts
 * Then paste the output into your .env
 */

import "dotenv/config";
import { generateKeyPair, PhantomClient, ApiKeyStamper } from "@phantom/server-sdk";

const APP_ID = process.env.PHANTOM_APP_ID || "";
const API_BASE = "https://api.phantom.app/v1/wallets";

async function setup() {
  if (!APP_ID) {
    console.error("✖ PHANTOM_APP_ID is not set in your .env");
    console.error("  Get it from: https://phantom.com/portal/");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Phantom Server SDK — Organization Setup         ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();

  // 1. Generate Ed25519 keypair (base58 encoded)
  console.log("1. Generating Ed25519 keypair...");
  const keyPair = generateKeyPair();
  console.log("   ✔ Keypair generated");
  console.log(`   Public Key:  ${keyPair.publicKey}`);
  console.log();

  // 2. Create stamper + client for bootstrap (no orgId needed yet)
  console.log("2. Creating organization with Phantom...");
  const stamper = new ApiKeyStamper({ apiSecretKey: keyPair.secretKey });
  const client = new PhantomClient({ apiBaseUrl: API_BASE }, stamper);

  const org = await client.createOrganization("BondIt", [
    {
      username: "bondit-admin",
      role: "ADMIN",
      authenticators: [
        {
          authenticatorKind: "keypair" as const,
          authenticatorName: "bondit-cli-key",
          publicKey: keyPair.publicKey,
          algorithm: "Ed25519" as any,
        },
      ],
    },
  ]);

  const orgId = (org as any).organizationId ?? (org as any).id ?? String(org);

  console.log("   ✔ Organization created!");
  console.log();

  // 3. Output the env vars
  console.log("════════════════════════════════════════════════════");
  console.log("  Add these to your .env file:");
  console.log("════════════════════════════════════════════════════");
  console.log();
  console.log(`PHANTOM_ORG_ID=${orgId}`);
  console.log(`PHANTOM_APP_ID=${APP_ID}`);
  console.log(`PHANTOM_PRIVATE_KEY=${keyPair.secretKey}`);
  console.log();
  console.log("════════════════════════════════════════════════════");
  console.log();
  console.log("⚠  SAVE THE PRIVATE KEY SECURELY — it cannot be recovered!");
  console.log("   Never commit it to git. Store it in your .env or secret manager.");
  console.log();

  // 4. Quick test — create a wallet
  console.log("3. Testing: creating a wallet...");
  client.setOrganizationId(orgId);
  const wallet = await client.createWallet("BondIt CLI Test");
  const solAddr = wallet.addresses.find((a) => String(a.addressType) === "Solana");

  console.log("   ✔ Wallet created!");
  console.log(`   Wallet ID:      ${wallet.walletId}`);
  console.log(`   Solana Address:  ${solAddr?.address ?? "(none)"}`);
  console.log();
  console.log("  Optionally add to .env to reuse this wallet:");
  console.log(`  PHANTOM_WALLET_ID=${wallet.walletId}`);
  console.log();
  console.log("✔ Setup complete! Phantom Server SDK is ready to use.");
}

setup().catch((err) => {
  console.error("\n✖ Setup failed:", err.message || err);
  if (String(err).includes("401") || String(err).includes("403")) {
    console.error("\n  This may mean the Server SDK requires approval from Phantom.");
    console.error("  Try contacting Phantom support or check if your App needs server-side access enabled.");
  }
  process.exit(1);
});
