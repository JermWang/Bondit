import { PublicKey } from "@solana/web3.js";
import { logger } from "./logger";

// ── Database Client ─────────────────────────────────────────────────────────
// Uses pg (node-postgres) with safe fallback if DATABASE_URL is not set.
// Supabase-compatible via standard Postgres connection string.

let pool: any = null;

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

async function getPool() {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — keeper DB queries will return empty results");
    return null;
  }

  try {
    const { Pool } = await import("pg");
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      ssl: getDatabaseSslConfig(),
    });

    // Test connection
    const client = await pool.connect();
    client.release();
    logger.info("Keeper connected to database");
    return pool;
  } catch (err) {
    logger.error({ err }, "Failed to connect to database — falling back to empty results");
    return null;
  }
}

// ── Query: Active Stewarding Launches ───────────────────────────────────────

export interface ActiveLaunchRow {
  launch_id: string;
  mint: string;
  curve_state: string | null;
  vault_state: string | null;
  policy_state: string | null;
  adapter_state: string | null;
  created_at: string;
  graduated_at: string | null;
}

export async function getActiveStewardingLaunches(): Promise<ActiveLaunchRow[]> {
  const db = await getPool();
  if (!db) return [];

  try {
    const result = await db.query(
      `SELECT launch_id, mint, curve_state, vault_state, policy_state, adapter_state, created_at, graduated_at
       FROM launches
       WHERE status = 1
       ORDER BY graduated_at ASC`
    );
    return result.rows;
  } catch (err) {
    logger.error({ err }, "Failed to query active launches");
    return [];
  }
}

// ── Query: Launches with Full Vault Info (for execute/compound) ─────────────

export interface LaunchWithVaults extends ActiveLaunchRow {
  // These come from on-chain state, but we cache them in DB after indexing
}

// ── Helper: Row → PublicKey map ─────────────────────────────────────────────

export function rowToPublicKeys(row: ActiveLaunchRow) {
  return {
    launchId: row.launch_id,
    mint: new PublicKey(row.mint),
    curveState: row.curve_state ? new PublicKey(row.curve_state) : null,
    vaultState: row.vault_state ? new PublicKey(row.vault_state) : null,
    policyState: row.policy_state ? new PublicKey(row.policy_state) : null,
    adapterState: row.adapter_state ? new PublicKey(row.adapter_state) : null,
    graduatedAt: row.graduated_at ? new Date(row.graduated_at) : null,
  };
}

// ── Write: Record Policy Action ─────────────────────────────────────────────

export async function recordPolicyAction(
  launchId: string,
  actionType: string,
  actionIndex: number,
  description: string,
  txSignature: string,
  slot: number,
  amounts?: Record<string, string>
): Promise<void> {
  const db = await getPool();
  if (!db) {
    logger.warn({ launchId, actionType }, "Skipping policy action record — no DB");
    return;
  }

  try {
    await db.query(
      `INSERT INTO policy_actions (launch_id, action_type, action_index, description, amounts, tx_signature, slot)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tx_signature) DO NOTHING`,
      [launchId, actionType, actionIndex, description, amounts ? JSON.stringify(amounts) : null, txSignature, slot]
    );
  } catch (err) {
    logger.error({ err, launchId, actionType }, "Failed to record policy action");
  }
}

// ── Write: Record Holder Snapshot ───────────────────────────────────────────

export async function recordHolderSnapshot(
  launchId: string,
  holdersCount: number,
  top10ConcentrationBps: number,
  top10Holders?: Record<string, number>[]
): Promise<void> {
  const db = await getPool();
  if (!db) return;

  try {
    await db.query(
      `INSERT INTO holder_snapshots (launch_id, holders_count, top10_concentration_bps, top10_holders)
       VALUES ($1, $2, $3, $4)`,
      [launchId, holdersCount, top10ConcentrationBps, top10Holders ? JSON.stringify(top10Holders) : null]
    );
  } catch (err) {
    logger.error({ err, launchId }, "Failed to record holder snapshot");
  }
}

// ── Write: Record Treasury Snapshot ─────────────────────────────────────────

export async function recordTreasurySnapshot(
  launchId: string,
  remaining: bigint,
  remainingPct: number,
  releasedTotal: bigint,
  releasedToday: bigint,
  releasedWeek: bigint
): Promise<void> {
  const db = await getPool();
  if (!db) return;

  try {
    await db.query(
      `INSERT INTO treasury_snapshots (launch_id, remaining, remaining_pct, released_total, released_today, released_week)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [launchId, remaining.toString(), remainingPct, releasedTotal.toString(), releasedToday.toString(), releasedWeek.toString()]
    );
  } catch (err) {
    logger.error({ err, launchId }, "Failed to record treasury snapshot");
  }
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
