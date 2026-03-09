import { logger } from "./logger";
import { AIProvider, ChatMessage, resolveProvider, parseByokHeaders, ByokOverride } from "./providers";
import { CreditTracker } from "./credits";
import { birdeye, pyth, xresearch } from "./skills";
import crypto from "crypto";
import type {
  LaunchCharterResponse,
  LaunchDashboardResponse,
  LaunchFeeBreakdownResponse,
  LaunchFlightStatusResponse,
  LaunchLiquidityStatsResponse,
  LaunchTreasuryResponse,
} from "@bondit/sdk/api";

const SYSTEM_PROMPT = `You are BondIt's advisory AI for a Solana token launch platform.
You answer community questions about launch status, charter parameters, treasury mechanics, flight mode, fees, and the Agency stewardship system.

Rules:
- Be concise, factual, and helpful.
- NEVER provide financial advice or price predictions.
- NEVER claim you can execute trades or modify protocol parameters.
- Always remind users that your responses are advisory only.
- Reference specific charter parameters and on-chain mechanics when relevant.
- If live context is missing, say exactly which indexed metrics are unavailable.
- Do not invent values that are not present in the provided launch context.`;

const INDEXER_API_BASE = process.env.INDEXER_API_URL ?? process.env.NEXT_PUBLIC_INDEXER_API_URL ?? "http://localhost:3001/api";

type MarketIntel = {
  birdeyeOverview: birdeye.TokenOverview | null;
  solPrice: pyth.PythPrice | null;
  sentiment: xresearch.SentimentSummary | null;
};

type QueryContext = {
  dashboard: LaunchDashboardResponse;
  charter: LaunchCharterResponse | null;
  treasury: LaunchTreasuryResponse | null;
  liquidity: LaunchLiquidityStatsResponse | null;
  flight: LaunchFlightStatusResponse | null;
  fees: LaunchFeeBreakdownResponse | null;
  market: MarketIntel;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    let details = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string; details?: string };
      details = payload.details ? `${payload.error ?? details}: ${payload.details}` : payload.error ?? details;
    } catch {}
    throw new Error(details);
  }

  return (await response.json()) as T;
}

function formatBpsPercent(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unavailable";
  return `${(value / 100).toFixed(2)}%`;
}

function formatDays(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unavailable";
  return `${value} days`;
}

/**
 * QueryHandler — answers community questions about a launch.
 * 
 * AI Authority:
 * - MAY answer factual questions about launch status, charter, metrics
 * - MAY explain policy mechanics
 * - MAY NOT provide financial advice or price predictions
 * - All responses include advisory disclaimer
 */
export class QueryHandler {
  private teamProvider: AIProvider | null;
  private credits: CreditTracker;

  constructor(teamProvider: AIProvider | null = null, credits?: CreditTracker) {
    this.teamProvider = teamProvider;
    this.credits = credits ?? new CreditTracker();
  }

  /** Get the credit tracker for status / alert endpoints */
  getCreditTracker(): CreditTracker {
    return this.credits;
  }

  async handleQuery(launchId: string, question: string, byok?: ByokOverride | null): Promise<QueryResponse> {
    const queryType = this.classifyQuery(question);
    const isByok = !!byok;
    logger.info({ launchId, queryType, questionLength: question.length, isByok }, "QueryHandler: processing");
    const context = await this.loadContext(launchId);

    const promptHash = crypto.createHash("sha256")
      .update(`query_${launchId}_${question}_${Date.now()}`)
      .digest("hex")
      .slice(0, 16);

    let answer: string;
    let modelId: string;
    let tier: "byok" | "team" | "grounded";
    let creditAlert: string | undefined;

    // Resolve the provider: BYOK > team-funded > grounded fallback
    const provider = byok
      ? resolveProvider(byok)
      : (this.credits.hasCredits() ? this.teamProvider : null);

    if (!provider && !byok && this.teamProvider) {
      // Team provider exists but credits are exhausted
      creditAlert = "Team AI credits are exhausted for today. This response uses indexed data only. Upgrade by providing your own API key (X-AI-Provider + X-AI-API-Key headers).";
      logger.warn({ launchId }, "QueryHandler: team credits exhausted, using grounded fallback");
    }

    if (provider) {
      try {
        const result = await provider.complete(this.buildMessages(launchId, question, queryType, context));
        answer = result.text;
        modelId = result.model;
        tier = isByok ? "byok" : "team";

        // Track spend for team-funded calls only
        if (!isByok) {
          this.credits.recordSpend(launchId, provider.name, modelId, result.inputTokens, result.outputTokens);
        }

        logger.info({ launchId, model: modelId, tokens: result.inputTokens + result.outputTokens, tier }, "QueryHandler: LLM response");
      } catch (err) {
        logger.error({ err, launchId }, "QueryHandler: LLM call failed, using grounded fallback");
        answer = this.buildGroundedFallbackAnswer(context, queryType, question);
        modelId = "bondit-grounded-fallback-v1";
        tier = "grounded";
      }
    } else {
      answer = this.buildGroundedFallbackAnswer(context, queryType, question);
      modelId = "bondit-grounded-fallback-v1";
      tier = "grounded";
    }

    return {
      launchId,
      question,
      answer,
      queryType,
      modelId,
      promptHash,
      tier,
      creditAlert,
      timestamp: Date.now(),
      disclaimer: "ADVISORY ONLY — This response is generated by AI for informational purposes. It does not constitute financial advice. The AI cannot execute trades or modify protocol parameters.",
    };
  }

  private async loadContext(launchId: string): Promise<QueryContext> {
    const dashboard = await fetchJson<LaunchDashboardResponse>(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}/dashboard`);

    const [charter, treasury, liquidity, flight, fees] = await Promise.allSettled([
      fetchJson<LaunchCharterResponse>(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}/charter`),
      fetchJson<LaunchTreasuryResponse>(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}/treasury`),
      fetchJson<LaunchLiquidityStatsResponse>(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}/liquidity`),
      fetchJson<LaunchFlightStatusResponse>(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}/flight-status`),
      fetchJson<LaunchFeeBreakdownResponse>(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}/fees`),
    ]);

    // Enrich with external market intelligence (non-blocking, best-effort)
    const mintAddress = (dashboard as any).mintAddress as string | undefined;
    const symbol = (dashboard as any).symbol as string | undefined;

    const [birdeyeResult, solPriceResult, sentimentResult] = await Promise.allSettled([
      mintAddress && birdeye.isConfigured() ? birdeye.getTokenOverview(mintAddress) : Promise.resolve(null),
      pyth.getSolPrice(),
      symbol && xresearch.isConfigured() ? xresearch.searchTokenSentiment(symbol, 10) : Promise.resolve(null),
    ]);

    return {
      dashboard,
      charter: charter.status === "fulfilled" ? charter.value : null,
      treasury: treasury.status === "fulfilled" ? treasury.value : null,
      liquidity: liquidity.status === "fulfilled" ? liquidity.value : null,
      flight: flight.status === "fulfilled" ? flight.value : null,
      fees: fees.status === "fulfilled" ? fees.value : null,
      market: {
        birdeyeOverview: birdeyeResult.status === "fulfilled" ? birdeyeResult.value : null,
        solPrice: solPriceResult.status === "fulfilled" ? solPriceResult.value : null,
        sentiment: sentimentResult.status === "fulfilled" ? sentimentResult.value : null,
      },
    };
  }

  private buildMessages(launchId: string, question: string, queryType: string, context: QueryContext): ChatMessage[] {
    // Build enriched context with market intel
    const enrichedContext: Record<string, unknown> = {
      dashboard: context.dashboard,
      charter: context.charter,
      treasury: context.treasury,
      liquidity: context.liquidity,
      flight: context.flight,
      fees: context.fees,
    };

    // Append market intelligence when available
    if (context.market.birdeyeOverview) {
      const b = context.market.birdeyeOverview;
      enrichedContext.marketData = {
        source: "birdeye",
        price: b.price,
        priceChange24h: `${b.priceChange24hPercent?.toFixed(2)}%`,
        volume24h: `$${b.volume24hUSD?.toLocaleString()}`,
        marketCap: `$${b.marketCap?.toLocaleString()}`,
        liquidity: `$${b.liquidity?.toLocaleString()}`,
        holders: b.holder,
      };
    }

    if (context.market.solPrice) {
      enrichedContext.solPrice = {
        source: "pyth",
        usd: context.market.solPrice.price.toFixed(2),
        confidence: context.market.solPrice.confidence.toFixed(4),
      };
    }

    if (context.market.sentiment && context.market.sentiment.tweetCount > 0) {
      enrichedContext.socialSentiment = {
        source: "x_research",
        tweetCount: context.market.sentiment.tweetCount,
        topTweets: context.market.sentiment.tweets.slice(0, 3).map((t) => ({
          text: t.text.slice(0, 200),
          likes: t.metrics.likes,
          retweets: t.metrics.retweets,
          author: t.authorUsername ?? t.authorId,
        })),
      };
    }

    return [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Launch ID: ${launchId}\nCategory: ${queryType}\nQuestion: ${question}\n\nLive launch context:\n${JSON.stringify(enrichedContext, null, 2)}`,
      },
    ];
  }

  private classifyQuery(question: string): string {
    const q = question.toLowerCase();
    if (q.includes("status") || q.includes("phase") || q.includes("graduated")) return "status";
    if (q.includes("charter") || q.includes("rules") || q.includes("parameters")) return "charter";
    if (q.includes("treasury") || q.includes("release") || q.includes("supply")) return "treasury";
    if (q.includes("flight") || q.includes("sunset") || q.includes("holders")) return "flight_mode";
    if (q.includes("fee") || q.includes("revenue") || q.includes("house")) return "fees";
    if (q.includes("how") || q.includes("what") || q.includes("explain")) return "mechanics";
    return "general";
  }

  private buildGroundedFallbackAnswer(context: QueryContext, queryType: string, question: string): string {
    const { dashboard, charter, treasury, liquidity, flight, fees } = context;
    const missing: string[] = [];

    if (!charter) missing.push("charter");
    if (!treasury) missing.push("treasury");
    if (!liquidity) missing.push("liquidity");
    if (!flight) missing.push("flight status");
    if (!fees) missing.push("fees");

    const availability = missing.length ? ` Indexed gaps: ${missing.join(", ")}.` : "";

    switch (queryType) {
      case "status":
        return `${dashboard.name} ($${dashboard.symbol}) is currently ${dashboard.status}. Graduation progress is ${dashboard.curve.graduationProgress}% with ${dashboard.curve.raisedSol} raised and ${dashboard.stewardship.holdersCount.toLocaleString()} holders.${availability}`;
      case "charter":
        return charter
          ? `The live charter for ${dashboard.name} shows a daily release rate of ${formatBpsPercent(charter.charter.dailyReleaseRateBps)}, max daily release ${charter.charter.maxDailyRelease}, max weekly release ${charter.charter.maxWeeklyRelease}, and a fee split of ${charter.charter.feeSplitLpBps / 100}% LP / ${charter.charter.feeSplitHouseBps / 100}% House.${availability}`
          : `The launch is indexed, but the charter snapshot is unavailable right now.${availability}`;
      case "treasury":
        return treasury
          ? `Treasury remaining is ${treasury.remaining} (${treasury.remainingPct.toFixed(2)}%). Released today: ${treasury.releasedToday}. Released this week: ${treasury.releasedThisWeek}. Total released: ${treasury.totalReleased}.${availability}`
          : `Treasury data is unavailable for this indexed launch right now.${availability}`;
      case "flight_mode":
        return flight
          ? `Flight mode is ${flight.isFlightMode ? "active" : flight.eligible ? "eligible but not yet active" : "not yet eligible"}. Holders are ${flight.conditions.holdersCount.toLocaleString()} / ${flight.conditions.holdersTarget.toLocaleString()}, top-10 concentration is ${formatBpsPercent(flight.conditions.top10ConcentrationBps)} against a ≤ ${formatBpsPercent(flight.conditions.top10Target)} target, and treasury remaining is ${formatBpsPercent(flight.conditions.treasuryRemainingBps)} against a ≤ ${formatBpsPercent(flight.conditions.treasuryTarget)} target. Days since graduation: ${formatDays(flight.conditions.daysSinceGraduation)} of ${formatDays(flight.conditions.maxDays)}.${availability}`
          : `Flight mode eligibility data is unavailable for this indexed launch right now.${availability}`;
      case "fees":
        return fees
          ? `Live fee totals show ${fees.totalFeesCollected} collected overall, ${fees.lpFeesCompounded} compounded back to LP, and ${fees.houseFeesCollected} collected for the house. The indexed split is ${fees.feeSplitLp}% LP / ${fees.feeSplitHouse}% House.${availability}`
          : `Fee breakdown data is unavailable for this indexed launch right now.${availability}`;
      case "mechanics":
        return `BondIt uses an indexed bonding-curve and stewardship flow: launches progress from ${dashboard.status}, treasury releases follow the immutable charter when available, and post-graduation liquidity plus fees are tracked through indexer snapshots. Ask a narrower question if you want a specific treasury, charter, fee, or flight-mode breakdown.${availability}`;
      default:
        return `I can answer questions about ${dashboard.name} ($${dashboard.symbol}) using live indexed status, treasury, charter, liquidity, fee, and flight-mode data. Your question was: "${question}".${availability}`;
    }
  }
}

export interface QueryResponse {
  launchId: string;
  question: string;
  answer: string;
  queryType: string;
  modelId: string;
  promptHash: string;
  tier: "byok" | "team" | "grounded";
  creditAlert?: string;
  timestamp: number;
  disclaimer: string;
}
