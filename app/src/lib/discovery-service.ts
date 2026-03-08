import {
  getDailyReport,
  getLaunchCharter,
  getLaunchDashboard,
  getLaunchFees,
  getLaunchFlightStatus,
  getLaunchLiquidity,
  getLaunches,
} from "@/lib/api";
import { type DiscoveryToken, type TrendingToken, TOKENS as MOCK_TOKENS, TRENDING as MOCK_TRENDING } from "@/lib/discovery";
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
  source: "live" | "empty";
  tokens: DiscoveryToken[];
  trending: TrendingToken[];
  error: string | null;
}

export interface TokenDetailResult {
  source: "live";
  launchId: string;
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
    grad: launch.badge === "graduating" ? 75 : launch.status === "CurveActive" ? 0 : 100,
    distPct: launch.badge === "flight" ? 100 : 0,
    up: change.up,
    change: change.label,
    replies: launch.repliesCount ?? 0,
    age: formatAge(launch.createdAt),
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

function formatAge(createdAt?: number | null): string {
  if (!createdAt || !Number.isFinite(createdAt)) return "live";
  const elapsedMinutes = Math.max(1, Math.floor((Date.now() - createdAt) / 60_000));
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h`;
  return `${Math.floor(elapsedHours / 24)}d`;
}

export async function loadDiscoveryFeed(): Promise<DiscoveryFeedResult> {
  try {
    const response = await getLaunches();

    if (!response.launches.length) {
      return {
        source: "empty",
        tokens: MOCK_TOKENS,
        trending: MOCK_TRENDING,
        error: null,
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
    return {
      source: "empty",
      tokens: MOCK_TOKENS,
      trending: MOCK_TRENDING,
      error: null,
    };
  }
}

export async function loadTokenDetail(ticker: string): Promise<TokenDetailResult | null> {
  try {
    const launches = await getLaunches();
    const launchIndex = launches.launches.findIndex((launch) => launch.symbol.toLowerCase() === ticker.toLowerCase());
    const launch = launchIndex >= 0 ? launches.launches[launchIndex] : null;

    if (!launch) {
      return null;
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
      notice: detailFailures > 0 ? "Some indexed detail panels are temporarily unavailable." : null,
    };
  } catch (error) {
    throw new Error(getLoadFailureMessage(error, "Live token detail unavailable right now"));
  }
}
