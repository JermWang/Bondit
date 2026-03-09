import { logger } from "../logger";

// ── Birdeye Analytics API ───────────────────────────────────────────────────
// Token analytics, prices, OHLCV, trending tokens on Solana.
// Docs: https://docs.birdeye.so/

const BASE_URL = "https://public-api.birdeye.so";

export interface TokenPrice {
  address: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  updateUnixTime: number;
}

export interface TokenOverview {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  price: number;
  priceChange24hPercent: number;
  volume24hUSD: number;
  marketCap: number;
  liquidity: number;
  holder: number;
  supply: number;
  logoURI?: string;
}

export interface OHLCVBar {
  unixTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TrendingToken {
  address: string;
  symbol: string;
  name: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  rank: number;
}

function getApiKey(): string | null {
  return process.env.BIRDEYE_API_KEY || null;
}

async function birdeyeGet<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.debug("Birdeye: no API key configured, skipping");
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
        "x-chain": "solana",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      logger.warn({ status: resp.status, path }, "Birdeye: API error");
      return null;
    }

    const json = (await resp.json()) as { success: boolean; data: T };
    return json.success ? json.data : null;
  } catch (err) {
    logger.warn({ err, path }, "Birdeye: request failed");
    return null;
  }
}

export async function getTokenPrice(tokenAddress: string): Promise<TokenPrice | null> {
  return birdeyeGet<TokenPrice>("/defi/price", { address: tokenAddress });
}

export async function getTokenOverview(tokenAddress: string): Promise<TokenOverview | null> {
  return birdeyeGet<TokenOverview>("/defi/token_overview", { address: tokenAddress });
}

export async function getOHLCV(
  tokenAddress: string,
  intervalType: "15m" | "1H" | "4H" | "1D" = "1H",
  limit = 24,
): Promise<OHLCVBar[] | null> {
  const now = Math.floor(Date.now() / 1000);
  const timeFrom = now - limit * (intervalType === "1D" ? 86400 : intervalType === "4H" ? 14400 : intervalType === "1H" ? 3600 : 900);

  const result = await birdeyeGet<{ items: OHLCVBar[] }>("/defi/ohlcv", {
    address: tokenAddress,
    type: intervalType,
    time_from: String(timeFrom),
    time_to: String(now),
  });

  return result?.items ?? null;
}

export async function getTrendingTokens(limit = 20): Promise<TrendingToken[] | null> {
  const result = await birdeyeGet<{ tokens: TrendingToken[] }>("/defi/token_trending", {
    sort_by: "volume24hUSD",
    sort_type: "desc",
    limit: String(limit),
  });

  return result?.tokens ?? null;
}

export function isConfigured(): boolean {
  return !!getApiKey();
}
