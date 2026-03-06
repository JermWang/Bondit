type LaunchStatusLabel = "CurveActive" | "Stewarding" | "FlightMode";
type LaunchBadgeType = "graduated" | "graduating" | "flight" | null;

type PolicyAction = {
  index: number;
  type: string;
  description: string;
  timestamp: number;
  txSignature: string;
  amounts?: { [key: string]: string };
};

type SampleLaunchRecord = {
  launch: {
    launchId: string;
    creator: string;
    mint: string;
    name: string;
    symbol: string;
    uri: string;
    status: LaunchStatusLabel;
    createdAt: number;
    graduatedAt: number | null;
    flightModeAt: number | null;
    marketCapUsd: string;
    volume24hUsd: string;
    lpDepthUsd: string;
    priceUsd: string;
    priceChange24hPct: number;
    holdersCount: number;
    top10ConcentrationBps: number;
    repliesCount: number;
    badge: LaunchBadgeType;
  };
  curve: {
    launchId: string;
    tokensSold: string;
    raisedSol: string;
    graduationProgress: number;
    currentPrice: string;
    isGraduated: boolean;
  };
  trades: Array<{
    trader: string;
    isBuy: boolean;
    solAmount: string;
    tokenAmount: string;
    fee: string;
    tokensSoldAfter: string;
    raisedSolAfter: string;
    txSignature: string;
    slot: number;
    timestamp: number;
  }>;
  charter: {
    launchId: string;
    charter: {
      dailyReleaseRateBps: number;
      maxDailyRelease: string;
      maxWeeklyRelease: string;
      sellPressureCapEarlyBps: number;
      sellPressureCapMatureBps: number;
      flightHoldersThreshold: number;
      flightTop10ConcentrationBps: number;
      flightTreasuryRemainingBps: number;
      maxStewardshipDuration: number;
      houseFeeEndsAtFlight: boolean;
      feeSplitLpBps: number;
      feeSplitHouseBps: number;
    };
  };
  treasury: {
    launchId: string;
    remaining: string;
    remainingPct: number;
    totalReleased: string;
    releasedToday: string;
    releasedThisWeek: string;
    releaseSchedule: Array<{
      timestamp: number;
      amount: string;
      destination: string;
    }>;
  };
  policyActions: PolicyAction[];
  holders: {
    launchId: string;
    holdersCount: number;
    top10ConcentrationBps: number;
    top10Holders: Array<{
      address: string;
      balance: string;
      percentageBps: number;
    }>;
  };
  liquidity: {
    launchId: string;
    venue: string;
    lpDepthUsd: string;
    depth2Pct: string;
    depth5Pct: string;
    totalLiquidityAddedSol: string;
    totalFeesHarvested: string;
    totalCompounded: string;
  };
  flight: {
    launchId: string;
    isFlightMode: boolean;
    eligible: boolean;
    conditions: {
      holdersCount: number;
      holdersTarget: number;
      holdersOk: boolean;
      top10ConcentrationBps: number;
      top10Target: number;
      concentrationOk: boolean;
      treasuryRemainingBps: number;
      treasuryTarget: number;
      treasuryOk: boolean;
      daysSinceGraduation: number;
      maxDays: number;
      forcedSunset: boolean;
    };
  };
  fees: {
    launchId: string;
    totalFeesCollected: string;
    lpFeesCompounded: string;
    houseFeesCollected: string;
    feeSplitLp: number;
    feeSplitHouse: number;
  };
  dashboard: {
    launchId: string;
    name: string;
    symbol: string;
    mint: string;
    status: LaunchStatusLabel;
    curve: SampleLaunchRecord["curve"];
    stewardship: {
      treasuryRemaining: string;
      treasuryRemainingPct: number;
      lpDepthUsd: string;
      holdersCount: number;
      top10ConcentrationBps: number;
      dayNumber: number;
    };
    flight: SampleLaunchRecord["flight"];
    fees: SampleLaunchRecord["fees"];
    recentActions: PolicyAction[];
  };
};

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

const baseCharter = {
  dailyReleaseRateBps: 20,
  maxDailyRelease: "1000000000000",
  maxWeeklyRelease: "5000000000000",
  sellPressureCapEarlyBps: 400,
  sellPressureCapMatureBps: 100,
  flightHoldersThreshold: 15000,
  flightTop10ConcentrationBps: 1800,
  flightTreasuryRemainingBps: 500,
  maxStewardshipDuration: 15552000,
  houseFeeEndsAtFlight: true,
  feeSplitLpBps: 9900,
  feeSplitHouseBps: 100,
};

function createTrades(launchId: string, baseTime: number, tokensSoldAfter: string, raisedSolAfter: string) {
  return [
    {
      trader: "9jGv...1qZP",
      isBuy: true,
      solAmount: "1500000000",
      tokenAmount: "182340000000",
      fee: "15000000",
      tokensSoldAfter,
      raisedSolAfter,
      txSignature: `${launchId}-trade-1`,
      slot: 258400001,
      timestamp: baseTime - 45 * 60 * 1000,
    },
    {
      trader: "5hKq...3LmN",
      isBuy: true,
      solAmount: "900000000",
      tokenAmount: "101220000000",
      fee: "9000000",
      tokensSoldAfter,
      raisedSolAfter,
      txSignature: `${launchId}-trade-2`,
      slot: 258400321,
      timestamp: baseTime - 18 * 60 * 1000,
    },
    {
      trader: "8sPw...7RtY",
      isBuy: false,
      solAmount: "420000000",
      tokenAmount: "47200000000",
      fee: "4200000",
      tokensSoldAfter,
      raisedSolAfter,
      txSignature: `${launchId}-trade-3`,
      slot: 258400654,
      timestamp: baseTime - 8 * 60 * 1000,
    },
  ];
}

function createPolicyActions(launchId: string, baseTime: number): PolicyAction[] {
  return [
    {
      index: 1,
      type: "treasury_release",
      description: "Released treasury inventory into LP support flow.",
      timestamp: baseTime - day,
      txSignature: `${launchId}-action-1`,
      amounts: { tokens: "300000000000" },
    },
    {
      index: 2,
      type: "lp_compound",
      description: "Harvested fees and compounded LP depth back into the active range.",
      timestamp: baseTime - 12 * 60 * 60 * 1000,
      txSignature: `${launchId}-action-2`,
      amounts: { lp: "14500", house: "150" },
    },
  ];
}

function createSampleLaunchRecord(input: {
  launchId: string;
  creator: string;
  mint: string;
  name: string;
  symbol: string;
  status: LaunchStatusLabel;
  marketCapUsd: string;
  volume24hUsd: string;
  lpDepthUsd: string;
  priceUsd: string;
  priceChange24hPct: number;
  holdersCount: number;
  top10ConcentrationBps: number;
  repliesCount: number;
  badge: LaunchBadgeType;
  tokensSold: string;
  raisedSol: string;
  graduationProgress: number;
  treasuryRemaining: string;
  treasuryRemainingPct: number;
  totalReleased: string;
  releasedToday: string;
  releasedThisWeek: string;
  totalLiquidityAddedSol: string;
  totalFeesHarvested: string;
  totalCompounded: string;
  totalFeesCollected: string;
  lpFeesCompounded: string;
  houseFeesCollected: string;
  dayNumber: number;
  isFlightMode: boolean;
  eligible: boolean;
}) : SampleLaunchRecord {
  const createdAt = now - input.dayNumber * day;
  const graduatedAt = input.status === "CurveActive" ? null : createdAt + day;
  const flightModeAt = input.status === "FlightMode" ? now - 2 * day : null;
  const treasuryRemainingBps = Math.round(input.treasuryRemainingPct * 100);
  const actions = createPolicyActions(input.launchId, now);

  const launch = {
    launchId: input.launchId,
    creator: input.creator,
    mint: input.mint,
    name: input.name,
    symbol: input.symbol,
    uri: `https://bondit.lol/token/${input.symbol.toLowerCase()}`,
    status: input.status,
    createdAt,
    graduatedAt,
    flightModeAt,
    marketCapUsd: input.marketCapUsd,
    volume24hUsd: input.volume24hUsd,
    lpDepthUsd: input.lpDepthUsd,
    priceUsd: input.priceUsd,
    priceChange24hPct: input.priceChange24hPct,
    holdersCount: input.holdersCount,
    top10ConcentrationBps: input.top10ConcentrationBps,
    repliesCount: input.repliesCount,
    badge: input.badge,
  };

  const curve = {
    launchId: input.launchId,
    tokensSold: input.tokensSold,
    raisedSol: input.raisedSol,
    graduationProgress: input.graduationProgress,
    currentPrice: input.priceUsd,
    isGraduated: input.status !== "CurveActive",
  };

  const treasury = {
    launchId: input.launchId,
    remaining: input.treasuryRemaining,
    remainingPct: input.treasuryRemainingPct,
    totalReleased: input.totalReleased,
    releasedToday: input.releasedToday,
    releasedThisWeek: input.releasedThisWeek,
    releaseSchedule: [
      {
        timestamp: now + 8 * 60 * 60 * 1000,
        amount: "300000000000",
        destination: "lp_reserve",
      },
    ],
  };

  const holders = {
    launchId: input.launchId,
    holdersCount: input.holdersCount,
    top10ConcentrationBps: input.top10ConcentrationBps,
    top10Holders: [
      { address: "5uAF...pQ1n", balance: "4820000000", percentageBps: 420 },
      { address: "9eRt...kL4m", balance: "4510000000", percentageBps: 395 },
      { address: "3nPw...tY8q", balance: "4100000000", percentageBps: 360 },
    ],
  };

  const liquidity = {
    launchId: input.launchId,
    venue: "Meteora DLMM",
    lpDepthUsd: input.lpDepthUsd,
    depth2Pct: input.lpDepthUsd,
    depth5Pct: `${Math.round(parseFloat(input.lpDepthUsd.replace(/[$M,K,]/g, "")) * 1.8)}K`,
    totalLiquidityAddedSol: input.totalLiquidityAddedSol,
    totalFeesHarvested: input.totalFeesHarvested,
    totalCompounded: input.totalCompounded,
  };

  const flight = {
    launchId: input.launchId,
    isFlightMode: input.isFlightMode,
    eligible: input.eligible,
    conditions: {
      holdersCount: input.holdersCount,
      holdersTarget: 15000,
      holdersOk: input.holdersCount >= 15000,
      top10ConcentrationBps: input.top10ConcentrationBps,
      top10Target: 1800,
      concentrationOk: input.top10ConcentrationBps <= 1800,
      treasuryRemainingBps,
      treasuryTarget: 500,
      treasuryOk: treasuryRemainingBps <= 500,
      daysSinceGraduation: input.dayNumber,
      maxDays: 180,
      forcedSunset: input.dayNumber >= 180,
    },
  };

  const fees = {
    launchId: input.launchId,
    totalFeesCollected: input.totalFeesCollected,
    lpFeesCompounded: input.lpFeesCompounded,
    houseFeesCollected: input.houseFeesCollected,
    feeSplitLp: 99,
    feeSplitHouse: 1,
  };

  return {
    launch,
    curve,
    trades: createTrades(input.launchId, now, input.tokensSold, input.raisedSol),
    charter: {
      launchId: input.launchId,
      charter: baseCharter,
    },
    treasury,
    policyActions: actions,
    holders,
    liquidity,
    flight,
    fees,
    dashboard: {
      launchId: input.launchId,
      name: input.name,
      symbol: input.symbol,
      mint: input.mint,
      status: input.status,
      curve,
      stewardship: {
        treasuryRemaining: input.treasuryRemaining,
        treasuryRemainingPct: input.treasuryRemainingPct,
        lpDepthUsd: input.lpDepthUsd,
        holdersCount: input.holdersCount,
        top10ConcentrationBps: input.top10ConcentrationBps,
        dayNumber: input.dayNumber,
      },
      flight,
      fees,
      recentActions: actions,
    },
  };
}

const SAMPLE_LAUNCH_RECORDS: SampleLaunchRecord[] = [
  createSampleLaunchRecord({
    launchId: "launch-giga",
    creator: "4xKm8nvXh8pQmYh9a8g7r6s5t4u3v2w1x9y8z7ABCD",
    mint: "Giga111111111111111111111111111111111111111",
    name: "GigaChad",
    symbol: "GIGA",
    status: "Stewarding",
    marketCapUsd: "$2.4M",
    volume24hUsd: "$892K",
    lpDepthUsd: "$2.4M",
    priceUsd: "$0.0024",
    priceChange24hPct: 247,
    holdersCount: 14203,
    top10ConcentrationBps: 1920,
    repliesCount: 3841,
    badge: "graduated",
    tokensSold: "423100000000000",
    raisedSol: "67300000000",
    graduationProgress: 79,
    treasuryRemaining: "21300000000000",
    treasuryRemainingPct: 14.2,
    totalReleased: "128700000000000",
    releasedToday: "284000000000",
    releasedThisWeek: "1892000000000",
    totalLiquidityAddedSol: "12400000000",
    totalFeesHarvested: "$145K",
    totalCompounded: "$132K",
    totalFeesCollected: "$148K",
    lpFeesCompounded: "$146K",
    houseFeesCollected: "$2K",
    dayNumber: 12,
    isFlightMode: false,
    eligible: false,
  }),
  createSampleLaunchRecord({
    launchId: "launch-moodeng",
    creator: "7pWnjK3sVw4qRt5yUi6oPa7sDf8gHj9kLm1nBvCxzY",
    mint: "Mood111111111111111111111111111111111111111",
    name: "Moo Deng",
    symbol: "MOODENG",
    status: "Stewarding",
    marketCapUsd: "$18.7M",
    volume24hUsd: "$4.2M",
    lpDepthUsd: "$7.9M",
    priceUsd: "$0.0187",
    priceChange24hPct: 1842,
    holdersCount: 28910,
    top10ConcentrationBps: 1450,
    repliesCount: 12403,
    badge: "graduated",
    tokensSold: "700000000000000",
    raisedSol: "85000000000",
    graduationProgress: 100,
    treasuryRemaining: "8700000000000",
    treasuryRemainingPct: 5.8,
    totalReleased: "141300000000000",
    releasedToday: "221000000000",
    releasedThisWeek: "1234000000000",
    totalLiquidityAddedSol: "32500000000",
    totalFeesHarvested: "$880K",
    totalCompounded: "$801K",
    totalFeesCollected: "$892K",
    lpFeesCompounded: "$883K",
    houseFeesCollected: "$9K",
    dayNumber: 27,
    isFlightMode: false,
    eligible: false,
  }),
  createSampleLaunchRecord({
    launchId: "launch-pnut",
    creator: "3mLxvQ7rNb6mHt5gFd4sAa3pOi2uYt1rEe0wQzXcVb",
    mint: "Pnut111111111111111111111111111111111111111",
    name: "Peanut the Squirrel",
    symbol: "PNUT",
    status: "CurveActive",
    marketCapUsd: "$892K",
    volume24hUsd: "$234K",
    lpDepthUsd: "$892K",
    priceUsd: "$0.00089",
    priceChange24hPct: 89.4,
    holdersCount: 4821,
    top10ConcentrationBps: 2600,
    repliesCount: 2104,
    badge: null,
    tokensSold: "312000000000000",
    raisedSol: "57000000000",
    graduationProgress: 67,
    treasuryRemaining: "150000000000000",
    treasuryRemainingPct: 100,
    totalReleased: "0",
    releasedToday: "0",
    releasedThisWeek: "0",
    totalLiquidityAddedSol: "0",
    totalFeesHarvested: "$0",
    totalCompounded: "$0",
    totalFeesCollected: "$23K",
    lpFeesCompounded: "$0",
    houseFeesCollected: "$0",
    dayNumber: 0,
    isFlightMode: false,
    eligible: false,
  }),
  createSampleLaunchRecord({
    launchId: "launch-brett",
    creator: "2hNxpK5tDe7fGh8jKl9mNo0pQr1sTu2vWx3yZaBcDe",
    mint: "Brett11111111111111111111111111111111111111",
    name: "Brett",
    symbol: "BRETT",
    status: "FlightMode",
    marketCapUsd: "$156M",
    volume24hUsd: "$12.3M",
    lpDepthUsd: "$41.2M",
    priceUsd: "$0.156",
    priceChange24hPct: -3.2,
    holdersCount: 42100,
    top10ConcentrationBps: 1120,
    repliesCount: 8921,
    badge: "flight",
    tokensSold: "800000000000000",
    raisedSol: "85000000000",
    graduationProgress: 100,
    treasuryRemaining: "6900000000000",
    treasuryRemainingPct: 4.6,
    totalReleased: "143100000000000",
    releasedToday: "0",
    releasedThisWeek: "0",
    totalLiquidityAddedSol: "55200000000",
    totalFeesHarvested: "$2.1M",
    totalCompounded: "$2.0M",
    totalFeesCollected: "$2.12M",
    lpFeesCompounded: "$2.1M",
    houseFeesCollected: "$21K",
    dayNumber: 66,
    isFlightMode: true,
    eligible: true,
  }),
];

export function listSampleLaunches() {
  return SAMPLE_LAUNCH_RECORDS.map((record) => record.launch);
}

export function getSampleLaunchRecord(launchId: string) {
  return SAMPLE_LAUNCH_RECORDS.find((record) => record.launch.launchId === launchId);
}
