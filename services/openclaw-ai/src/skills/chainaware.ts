import { logger } from "../logger";

// ── ChainAware Behavioural Prediction API ───────────────────────────────────
// Fraud detection, rug-pull prediction, wallet behavior analysis.
// Docs: https://github.com/ChainAware/behavioral-prediction-mcp
// API:  https://prediction.mcp.chainaware.ai/

const BASE_URL = "https://prediction.mcp.chainaware.ai";

export interface FraudResult {
  walletAddress: string;
  status: "Fraud" | "Not Fraud" | "New Address";
  probabilityFraud: string;
  forensicDetails?: Record<string, unknown>;
}

export interface BehaviourResult {
  walletAddress: string;
  status: string;
  probabilityFraud: string;
  categories?: Array<{ Category: string; Count: number }>;
  intention?: { Type: string; Value: Record<string, string> };
  riskProfile?: Array<{ Category: string; Balance_age: number }>;
  recommendation?: { Type: string; Value: string[] };
}

export interface RugPullResult {
  tokenAddress: string;
  rugPullRisk: string;
  riskScore: number;
  details?: Record<string, unknown>;
}

export interface TokenRankItem {
  address: string;
  name?: string;
  symbol?: string;
  rank: number;
  score: number;
}

async function callChainAware<T>(endpoint: string, params: Record<string, string>): Promise<T | null> {
  const apiKey = process.env.CHAINAWARE_API_KEY;
  if (!apiKey) {
    logger.debug("ChainAware: no API key configured, skipping");
    return null;
  }

  try {
    const resp = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ apiKey, ...params }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      logger.warn({ status: resp.status, endpoint }, "ChainAware: API error");
      return null;
    }

    return (await resp.json()) as T;
  } catch (err) {
    logger.warn({ err, endpoint }, "ChainAware: request failed");
    return null;
  }
}

export async function detectFraud(walletAddress: string, network = "SOLANA"): Promise<FraudResult | null> {
  return callChainAware<FraudResult>("predictive_fraud", { walletAddress, network });
}

export async function analyzeBehaviour(walletAddress: string, network = "SOLANA"): Promise<BehaviourResult | null> {
  return callChainAware<BehaviourResult>("predictive_behaviour", { walletAddress, network });
}

export async function detectRugPull(tokenAddress: string, network = "SOLANA"): Promise<RugPullResult | null> {
  return callChainAware<RugPullResult>("predictive_rug_pull", { walletAddress: tokenAddress, network });
}

export async function getTokenRanks(network = "SOLANA", limit = 20): Promise<TokenRankItem[] | null> {
  return callChainAware<TokenRankItem[]>("token_rank_list", { network, limit: String(limit) });
}
