import { logger } from "../logger";

// ── Pyth Network Price Feeds ────────────────────────────────────────────────
// Real-time price feeds via Hermes REST API (free, no key needed).
// Docs: https://docs.pyth.network/price-feeds/use-real-time-data/hermes

const HERMES_URL = "https://hermes.pyth.network";

// Well-known Pyth price feed IDs for common Solana assets
export const FEED_IDS: Record<string, string> = {
  SOL:  "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BTC:  "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH:  "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  USDC: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  USDT: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
};

export interface PythPrice {
  feedId: string;
  symbol: string;
  price: number;
  confidence: number;
  publishTime: number;
  emaPrice: number;
}

export async function getPrice(feedId: string, symbol?: string): Promise<PythPrice | null> {
  try {
    const url = `${HERMES_URL}/v2/updates/price/latest?ids[]=${feedId}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8_000) });

    if (!resp.ok) {
      logger.warn({ status: resp.status, feedId }, "Pyth: API error");
      return null;
    }

    const json = (await resp.json()) as { parsed: Array<{ id: string; price: { price: string; expo: number; conf: string; publish_time: number }; ema_price: { price: string; expo: number } }> };

    const entry = json.parsed?.[0];
    if (!entry) return null;

    const expo = entry.price.expo;
    const price = Number(entry.price.price) * Math.pow(10, expo);
    const confidence = Number(entry.price.conf) * Math.pow(10, expo);
    const emaPrice = Number(entry.ema_price.price) * Math.pow(10, entry.ema_price.expo);

    return {
      feedId: entry.id,
      symbol: symbol ?? entry.id.slice(0, 8),
      price,
      confidence,
      publishTime: entry.price.publish_time,
      emaPrice,
    };
  } catch (err) {
    logger.warn({ err, feedId }, "Pyth: request failed");
    return null;
  }
}

export async function getSolPrice(): Promise<PythPrice | null> {
  return getPrice(FEED_IDS.SOL, "SOL");
}

export async function getMultiplePrices(symbols: string[]): Promise<Map<string, PythPrice>> {
  const results = new Map<string, PythPrice>();
  const ids = symbols
    .map((s) => ({ symbol: s, feedId: FEED_IDS[s.toUpperCase()] }))
    .filter((e) => e.feedId);

  if (ids.length === 0) return results;

  try {
    const params = ids.map((e) => `ids[]=${e.feedId}`).join("&");
    const url = `${HERMES_URL}/v2/updates/price/latest?${params}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!resp.ok) return results;

    const json = (await resp.json()) as { parsed: Array<{ id: string; price: { price: string; expo: number; conf: string; publish_time: number }; ema_price: { price: string; expo: number } }> };

    for (const entry of json.parsed ?? []) {
      const matched = ids.find((e) => e.feedId.replace("0x", "") === entry.id);
      if (!matched) continue;

      const expo = entry.price.expo;
      results.set(matched.symbol, {
        feedId: entry.id,
        symbol: matched.symbol,
        price: Number(entry.price.price) * Math.pow(10, expo),
        confidence: Number(entry.price.conf) * Math.pow(10, expo),
        publishTime: entry.price.publish_time,
        emaPrice: Number(entry.ema_price.price) * Math.pow(10, entry.ema_price.expo),
      });
    }
  } catch (err) {
    logger.warn({ err }, "Pyth: multi-price request failed");
  }

  return results;
}

// Pyth Hermes is free — always available
export function isConfigured(): boolean {
  return true;
}
