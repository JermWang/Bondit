import {
  getDailyReport,
  getLaunchCharter,
  getLaunchDashboard,
  getLaunchFees,
  getLaunchFlightStatus,
  getLaunchLiquidity,
  getLaunches,
} from "@/lib/api";
import { TOKENS, TRENDING, type DiscoveryToken, type TrendingToken } from "@/lib/discovery";
import type {
  LaunchCharterResponse,
  LaunchDashboardResponse,
  LaunchFeeBreakdownResponse,
  LaunchFlightStatusResponse,
  LaunchLiquidityStatsResponse,
  LaunchListItem,
  TransparencyReport,
} from "@bondit/sdk/api";

export interface DiscoveryFeedResult {
  source: "live" | "fixture";
  tokens: DiscoveryToken[];
  trending: TrendingToken[];
  error: string | null;
}

export interface TokenDetailResult {
  source: "live" | "fixture";
  launchId: string | null;
  token: DiscoveryToken;
  dashboard: LaunchDashboardResponse | null;
  charter: LaunchCharterResponse | null;
  liquidity: LaunchLiquidityStatsResponse | null;
  flight: LaunchFlightStatusResponse | null;
  fees: LaunchFeeBreakdownResponse | null;
  report: TransparencyReport | null;
  notice: string | null;
}

function getLoadFailureMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  const normalized = message.toLowerCase();
  if (!message || normalized.includes("fetch failed") || normalized.includes("failed to fetch")) {
    return fallback;
  }
  return message;
}

function shortenAddress(value: string): string {
  if (!value || value.length < 10) return value || "unknown";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function parseChange(change?: number | null): { label: string; up: boolean } {
  const value = change ?? 0;
  const up = value >= 0;
  return {
    label: `${up ? "+" : ""}${value.toFixed(1)}%`,
    up,
  };
}

function mapLaunchToDiscoveryToken(launch: LaunchListItem, index: number): DiscoveryToken {
  const change = parseChange(launch.priceChange24hPct);

  return {
    ticker: launch.symbol,
    name: launch.name,
    avatar: index % 8,
    desc: `Created by ${shortenAddress(launch.creator)}. ${launch.name} is now live on BondIt.lol with deterministic stewardship and transparent launch analytics.`,
    mcap: launch.marketCapUsd ?? "$—",
    vol: launch.volume24hUsd ?? "$—",
    holders: launch.holdersCount ?? 0,
    grad: launch.status === "CurveActive" ? 0 : 100,
    distPct: 0,
    up: change.up,
    change: change.label,
    replies: launch.repliesCount ?? 0,
    age: "live",
    creator: shortenAddress(launch.creator),
    badgeType: launch.badge ?? null,
  };
}

function mapLaunchToTrendingToken(launch: LaunchListItem, index: number): TrendingToken {
  const change = parseChange(launch.priceChange24hPct);

  return {
    ticker: launch.symbol,
    name: launch.name,
    mcap: launch.marketCapUsd ?? "$—",
    change: change.label,
    up: change.up,
    creator: shortenAddress(launch.creator),
    avatar: index % 8,
  };
}

function findFixtureTokenByTicker(ticker: string): DiscoveryToken | undefined {
  return TOKENS.find((token) => token.ticker.toLowerCase() === ticker.toLowerCase());
}

function buildFixtureTokenDetail(token: DiscoveryToken, notice: string | null): TokenDetailResult {
  return {
    source: "fixture",
    launchId: null,
    token,
    dashboard: null,
    charter: null,
    liquidity: null,
    flight: null,
    fees: null,
    report: null,
    notice,
  };
}

export async function loadDiscoveryFeed(): Promise<DiscoveryFeedResult> {
  try {
    const response = await getLaunches();

    if (!response.launches.length) {
      return {
        source: "fixture",
        tokens: TOKENS,
        trending: TRENDING,
        error: "Indexer returned no launches yet. Using BondIt fixture feed.",
      };
    }

    const tokens = response.launches.map(mapLaunchToDiscoveryToken);
    const trending = response.launches.slice(0, 8).map(mapLaunchToTrendingToken);

    return {
      source: "live",
      tokens,
      trending,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load indexed launches.";

    return {
      source: "fixture",
      tokens: TOKENS,
      trending: TRENDING,
      error: `${getLoadFailureMessage(error, "Live discovery feed unavailable right now")}. Falling back to fixture discovery data.`,
    };
  }
}

export async function loadTokenDetail(ticker: string): Promise<TokenDetailResult | null> {
  const fixtureToken = findFixtureTokenByTicker(ticker);

  try {
    const launches = await getLaunches();
    const launchIndex = launches.launches.findIndex((launch) => launch.symbol.toLowerCase() === ticker.toLowerCase());
    const launch = launchIndex >= 0 ? launches.launches[launchIndex] : null;

    if (!launch) {
      return fixtureToken
        ? buildFixtureTokenDetail(fixtureToken, "Live launch not found. Using BondIt fixture detail view.")
        : null;
    }

    const [dashboard, charter, liquidity, flight, fees, report] = await Promise.allSettled([
      getLaunchDashboard(launch.launchId),
      getLaunchCharter(launch.launchId),
      getLaunchLiquidity(launch.launchId),
      getLaunchFlightStatus(launch.launchId),
      getLaunchFees(launch.launchId),
      getDailyReport(launch.launchId),
    ]);

    const detailFailures = [dashboard, charter, liquidity, flight, fees, report].filter((result) => result.status === "rejected").length;

    return {
      source: "live",
      launchId: launch.launchId,
      token: mapLaunchToDiscoveryToken(launch, launchIndex),
      dashboard: dashboard.status === "fulfilled" ? dashboard.value : null,
      charter: charter.status === "fulfilled" ? charter.value : null,
      liquidity: liquidity.status === "fulfilled" ? liquidity.value : null,
      flight: flight.status === "fulfilled" ? flight.value : null,
      fees: fees.status === "fulfilled" ? fees.value : null,
      report: report.status === "fulfilled" ? report.value : null,
      notice: detailFailures > 0 ? "Some live detail panels are still loading from the indexed services." : null,
    };
  } catch (error) {
    if (!fixtureToken) return null;

    const message = getLoadFailureMessage(error, "Live token detail unavailable right now");

    return buildFixtureTokenDetail(
      fixtureToken,
      `${message}. Using BondIt fixture detail view.`,
    );
  }
}
