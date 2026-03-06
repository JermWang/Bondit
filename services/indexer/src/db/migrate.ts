import * as dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "../logger";
import { getDatabasePool } from "./client";

dotenv.config();

async function main() {
  const pool = getDatabasePool();

  if (!pool) {
    throw new Error("A Postgres connection string is required to run indexer migrations. Set DATABASE_URL, SUPABASE_DB_URL, SUPABASE_DATABASE_URL, or POSTGRES_URL.");
  }

  const schemaPath = path.resolve(__dirname, "../../../../services/db/init.sql");
  const schemaSql = await readFile(schemaPath, "utf8");

  await pool.query(schemaSql);
  logger.info("Indexer migrations applied.");
  await pool.end();
}

main().catch((err) => {
  logger.error({ err }, "Indexer migration failed");
  process.exit(1);
});
