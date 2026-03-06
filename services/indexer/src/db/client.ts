import Redis from "ioredis";
import { Pool } from "pg";
import { logger } from "../logger";

let pool: Pool | null = null;
let redis: Redis | null = null;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function getDatabaseSslConfig() {
  const mode = (process.env.DATABASE_SSL_MODE ?? "").trim().toLowerCase();
  if (!mode || mode === "disable") {
    return undefined;
  }

  return {
    rejectUnauthorized: parseBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, false),
  };
}

export function getDatabaseConnectionString(): string | null {
  return process.env.DATABASE_URL
    ?? process.env.SUPABASE_DB_URL
    ?? process.env.SUPABASE_DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? null;
}

export function getDatabasePool(): Pool | null {
  const connectionString = getDatabaseConnectionString();
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      ssl: getDatabaseSslConfig(),
    });
    pool.on("error", (err: unknown) => {
      logger.error({ err }, "Indexer DB pool error");
    });
  }

  return pool;
}

export function getRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  if (!redis) {
    redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    redis.on("error", (err: unknown) => {
      logger.error({ err }, "Indexer Redis error");
    });
  }

  return redis;
}

export async function ensureRedisConnection(client: Redis | null): Promise<void> {
  if (!client) {
    return;
  }

  if (client.status === "wait") {
    await client.connect();
  }
}
