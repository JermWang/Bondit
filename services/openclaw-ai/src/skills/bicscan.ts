import { logger } from "../logger";

// ── BICScan Risk Scanner API ────────────────────────────────────────────────
// Blockchain address risk scoring: 0-100 (100 = high risk).
// Docs: https://github.com/ahnlabio/bicscan-mcp
// Free API key: https://www.bicscan.io

const BASE_URL = "https://api.bicscan.io/v1";

export interface RiskScore {
  address: string;
  riskScore: number;          // 0-100, 100 = highest risk
  riskLevel: "low" | "medium" | "high" | "critical";
  categories: string[];       // e.g. ["scam", "mixer", "clean"]
  details?: Record<string, unknown>;
}

export interface AssetInfo {
  address: string;
  chain: string;
  assets: Array<{
    symbol: string;
    balance: string;
    valueUsd?: number;
  }>;
}

function getApiKey(): string | null {
  return process.env.BICSCAN_API_KEY || null;
}

async function bicscanGet<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.debug("BICScan: no API key configured, skipping");
    return null;
  }

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }

  try {
    const resp = await fetch(url.toString(), {
      headers: {
        "X-API-KEY": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      logger.warn({ status: resp.status, path }, "BICScan: API error");
      return null;
    }

    return (await resp.json()) as T;
  } catch (err) {
    logger.warn({ err, path }, "BICScan: request failed");
    return null;
  }
}

export async function scoreAddress(address: string, chain = "solana"): Promise<RiskScore | null> {
  const raw = await bicscanGet<Record<string, unknown>>("/address/risk", { address, chain });
  if (!raw) return null;

  const score = typeof raw.risk_score === "number" ? raw.risk_score : 0;
  const level: RiskScore["riskLevel"] =
    score >= 80 ? "critical" : score >= 60 ? "high" : score >= 30 ? "medium" : "low";

  return {
    address,
    riskScore: score,
    riskLevel: level,
    categories: Array.isArray(raw.categories) ? raw.categories as string[] : [],
    details: raw,
  };
}

export async function getAssets(address: string, chain = "solana"): Promise<AssetInfo | null> {
  return bicscanGet<AssetInfo>("/address/assets", { address, chain });
}

export function isConfigured(): boolean {
  return !!getApiKey();
}
