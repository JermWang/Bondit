require("dotenv").config();
const { Keypair } = require("@solana/web3.js");
const bs58 = require("bs58");
const { Client } = require("pg");

const db = new Client({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/bondit"
});

async function main() {
  await db.connect();
  
  // Create table if it doesn't exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS vanity_keypairs (
      pubkey VARCHAR(44) PRIMARY KEY,
      secret_key VARCHAR(128) NOT NULL,
      suffix VARCHAR(10) NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log("Started grinding vanity addresses ending in 'LOL'...");
  
  let attempts = 0;
  let found = 0;
  
  while (true) {
    attempts++;
    const keypair = Keypair.generate();
    const pubkey = keypair.publicKey.toBase58();
    
    // Check for "LOL" ignoring case since bs58 is case sensitive, but if you want exact "LOL" use strict comparison
    if (pubkey.endsWith("LOL")) {
      const secret = bs58.encode(keypair.secretKey);
      
      try {
        await db.query(
          "INSERT INTO vanity_keypairs (pubkey, secret_key, suffix) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
          [pubkey, secret, "LOL"]
        );
        found++;
        console.log(`[${new Date().toISOString()}] Found vanity! ${pubkey} (attempts: ${attempts}, total found: ${found})`);
        attempts = 0;
      } catch (err) {
        console.error("DB Error:", err);
      }
    }
    
    if (attempts % 100000 === 0) {
      console.log(`[${new Date().toISOString()}] Ground ${attempts} keypairs, still searching...`);
    }
    
    // Tiny sleep occasionally to not lock CPU entirely if running on same node
    if (attempts % 10000 === 0) {
      await new Promise(r => setImmediate(r));
    }
  }
}

main().catch(console.error);
