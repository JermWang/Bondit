import { Connection, Keypair } from "@solana/web3.js";
import { CronJob } from "cron";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { MonitorJob } from "./jobs/monitor";
import { ExecuteJob } from "./jobs/execute";
import { CompoundJob } from "./jobs/compound";
import { FlightCheckJob } from "./jobs/flight-check";
import { logger } from "./logger";
import { closePool } from "./db";

dotenv.config();

async function main() {
  logger.info("BondIt.lol Keeper starting...");

  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const keypairPath = process.env.KEEPER_KEYPAIR_PATH || "./keeper-keypair.json";
  if (!fs.existsSync(keypairPath)) {
    logger.error(`Keeper keypair not found at ${keypairPath}`);
    process.exit(1);
  }
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const keeper = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  logger.info(`Keeper pubkey: ${keeper.publicKey.toBase58()}`);

  const monitorJob = new MonitorJob(connection, keeper);
  const executeJob = new ExecuteJob(connection, keeper);
  const compoundJob = new CompoundJob(connection, keeper);
  const flightCheckJob = new FlightCheckJob(connection, keeper);

  // Hourly monitor crank: every hour at :00
  const monitorCron = new CronJob("0 * * * *", async () => {
    try {
      logger.info("Running hourly monitor...");
      await monitorJob.run();
    } catch (err) {
      logger.error({ err }, "Monitor job failed");
    }
  });

  // Daily execution crank: every day at 00:00 UTC
  const executeCron = new CronJob("0 0 * * *", async () => {
    try {
      logger.info("Running daily execution...");
      await executeJob.run();
      await compoundJob.run();
    } catch (err) {
      logger.error({ err }, "Daily execution failed");
    }
  });

  // Flight mode check: every 6 hours
  const flightCron = new CronJob("0 */6 * * *", async () => {
    try {
      logger.info("Running flight mode check...");
      await flightCheckJob.run();
    } catch (err) {
      logger.error({ err }, "Flight check failed");
    }
  });

  monitorCron.start();
  executeCron.start();
  flightCron.start();

  logger.info("Keeper cron jobs started:");
  logger.info("  - Monitor: hourly at :00");
  logger.info("  - Execute + Compound: daily at 00:00 UTC");
  logger.info("  - Flight check: every 6 hours");

  // Graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Shutting down keeper...");
    monitorCron.stop();
    executeCron.stop();
    flightCron.stop();
    await closePool();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error({ err }, "Keeper fatal error");
  process.exit(1);
});
