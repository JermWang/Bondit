import { logger } from "../logger";

// ── Dune Analytics API ──────────────────────────────────────────────────────
// On-chain data queries across 100+ blockchains.
// Docs: https://docs.dune.com/api-reference/
// Free tier: 2,500 credits/month

const BASE_URL = "https://api.dune.com/api/v1";

export interface DuneQueryResult {
  queryId: number;
  rows: Record<string, unknown>[];
  metadata: {
    columnNames: string[];
    rowCount: number;
    executionId: string;
  };
}

export interface TokenHolderStats {
  totalHolders: number;
  top10Pct: number;
  top50Pct: number;
  giniCoefficient?: number;
}

export interface VolumeStats {
  volume24h: number;
  volume7d: number;
  txCount24h: number;
  uniqueTraders24h: number;
}

function getApiKey(): string | null {
  return process.env.DUNE_API_KEY || null;
}

async function duneGet<T>(path: string): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.debug("Dune: no API key configured, skipping");
    return null;
  }

  try {
    const resp = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "X-Dune-API-Key": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      logger.warn({ status: resp.status, path }, "Dune: API error");
      return null;
    }

    return (await resp.json()) as T;
  } catch (err) {
    logger.warn({ err, path }, "Dune: request failed");
    return null;
  }
}

async function dunePost<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.debug("Dune: no API key configured, skipping");
    return null;
  }

  try {
    const resp = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "X-Dune-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      logger.warn({ status: resp.status, path }, "Dune: API error");
      return null;
    }

    return (await resp.json()) as T;
  } catch (err) {
    logger.warn({ err, path }, "Dune: request failed");
    return null;
  }
}

/**
 * Execute a saved Dune query by ID and return results.
 * Queries must be pre-created in the Dune dashboard.
 */
export async function executeQuery(queryId: number, params?: Record<string, string>): Promise<DuneQueryResult | null> {
  // Trigger execution
  const execResp = await dunePost<{ execution_id: string }>(`/query/${queryId}/execute`, {
    query_parameters: params ?? {},
  });

  if (!execResp?.execution_id) return null;

  // Poll for results (max 60s)
  const executionId = execResp.execution_id;
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const status = await duneGet<{
      state: string;
      result?: {
        rows: Record<string, unknown>[];
        metadata: { column_names: string[]; total_row_count: number };
      };
    }>(`/execution/${executionId}/results`);

    if (!status) return null;

    if (status.state === "QUERY_STATE_COMPLETED" && status.result) {
      return {
        queryId,
        rows: status.result.rows,
        metadata: {
          columnNames: status.result.metadata.column_names,
          rowCount: status.result.metadata.total_row_count,
          executionId,
        },
      };
    }

    if (status.state === "QUERY_STATE_FAILED") {
      logger.warn({ queryId, executionId }, "Dune: query execution failed");
      return null;
    }

    // Wait 2s between polls
    await new Promise((r) => setTimeout(r, 2000));
  }

  logger.warn({ queryId, executionId }, "Dune: query execution timed out");
  return null;
}

/**
 * Get the latest results of a query without re-executing.
 * Much faster and cheaper — uses cached results.
 */
export async function getLatestResults(queryId: number): Promise<DuneQueryResult | null> {
  const resp = await duneGet<{
    result: {
      rows: Record<string, unknown>[];
      metadata: { column_names: string[]; total_row_count: number };
    };
    execution_id: string;
  }>(`/query/${queryId}/results`);

  if (!resp?.result) return null;

  return {
    queryId,
    rows: resp.result.rows,
    metadata: {
      columnNames: resp.result.metadata.column_names,
      rowCount: resp.result.metadata.total_row_count,
      executionId: resp.execution_id,
    },
  };
}

export function isConfigured(): boolean {
  return !!getApiKey();
}
