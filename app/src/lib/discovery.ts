import type { LaunchBadgeType } from "@bondit/sdk/api";

export const AVATARS = [
  "avatar-gradient-1",
  "avatar-gradient-2",
  "avatar-gradient-3",
  "avatar-gradient-4",
  "avatar-gradient-5",
  "avatar-gradient-6",
  "avatar-gradient-7",
  "avatar-gradient-8",
] as const;

export const AVATAR_BACKGROUNDS = [
  "linear-gradient(135deg, #88CC00, #4F46E5)",
  "linear-gradient(135deg, #EC4899, #F43F5E)",
  "linear-gradient(135deg, #06B6D4, #3B82F6)",
  "linear-gradient(135deg, #10B981, #06B6D4)",
  "linear-gradient(135deg, #F43F5E, #F59E0B)",
  "linear-gradient(135deg, #A9FF00, #EC4899)",
  "linear-gradient(135deg, #F59E0B, #A9FF00)",
  "linear-gradient(135deg, #C8FF4D, #06B6D4)",
] as const;

export function getAvatarStyle(index: number) {
  return {
    background: AVATAR_BACKGROUNDS[((index % AVATAR_BACKGROUNDS.length) + AVATAR_BACKGROUNDS.length) % AVATAR_BACKGROUNDS.length],
  };
}

export interface TrendingToken {
  ticker: string;
  name: string;
  mcap: string;
  change: string;
  up: boolean;
  creator: string;
  avatar: number;
  img?: string;
}

export interface DiscoveryToken {
  ticker: string;
  name: string;
  avatar: number;
  img?: string;
  desc: string;
  mcap: string;
  vol: string;
  holders: number;
  grad: number;
  distPct: number;
  up: boolean;
  change: string;
  replies: number;
  age: string;
  creator: string;
  badgeType: LaunchBadgeType;
}

const DSX = "https://cdn.dexscreener.com/tokens/solana";

export const TRENDING: TrendingToken[] = [
  { ticker: "BONK", name: "Bonk Inu", mcap: "$94.2M", change: "+34.2%", up: true, creator: "CKf8...x9Wp", avatar: 0, img: `${DSX}/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263.png` },
  { ticker: "WIF", name: "dogwifhat", mcap: "$2.1B", change: "+12.8%", up: true, creator: "7nYB...mK2p", avatar: 1, img: `${DSX}/EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm.png` },
  { ticker: "POPCAT", name: "Popcat", mcap: "$412M", change: "+89.3%", up: true, creator: "3hJK...vN8r", avatar: 2, img: `${DSX}/7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr.png` },
  { ticker: "BOME", name: "BOOK OF MEME", mcap: "$678M", change: "-4.1%", up: false, creator: "9pLM...tQ3s", avatar: 3, img: `${DSX}/ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82.png` },
  { ticker: "MEW", name: "cat in a dogs world", mcap: "$891M", change: "+21.5%", up: true, creator: "5wRK...jH4m", avatar: 4, img: `${DSX}/MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5.png` },
  { ticker: "SLERF", name: "SLERF", mcap: "$42.8M", change: "+156%", up: true, creator: "8dNP...kL7w", avatar: 5, img: `${DSX}/7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3.png` },
  { ticker: "MYRO", name: "Myro", mcap: "$67.3M", change: "+8.7%", up: true, creator: "2jQR...nX5v", avatar: 6, img: `${DSX}/HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4.png` },
  { ticker: "MICHI", name: "michi", mcap: "$189M", change: "-2.3%", up: false, creator: "6tFG...pR9k", avatar: 7, img: `${DSX}/5mbK36SZ7J19An8jFochhQS4of8g6BwUjbeCSxBSoWdp.png` },
];

export const TOKENS: DiscoveryToken[] = [
  { ticker: "GIGA",     name: "GigaChad",            avatar: 0, img: `${DSX}/63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9.png`, desc: "Created by 4xKm...nR8p. The ultimate chad token. Community-driven with diamond hands only. Agency stewardship ensures fair distribution.", mcap: "$2.4M",  vol: "$892K",  holders: 14203, grad: 100, distPct: 3,  up: true,  change: "+247%",   replies: 3841,  age: "8h",  creator: "4xKm...nR8p", badgeType: "graduated" },
  { ticker: "MOODENG",  name: "Moo Deng",             avatar: 1, img: `${DSX}/ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY.png`,  desc: "Created by 7pWn...jK3s. Baby hippo taking over Solana. Fair launch, no presale, 100% community owned. Stewardship day 12.",        mcap: "$18.7M", vol: "$4.2M",  holders: 28910, grad: 100, distPct: 11, up: true,  change: "+1,842%", replies: 12403, age: "2d",  creator: "7pWn...jK3s", badgeType: "graduated" },
  { ticker: "PNUT",     name: "Peanut the Squirrel", avatar: 2, img: `${DSX}/2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump.png`, desc: "Created by 3mLx...vQ7r. Justice for Peanut. Community rallying behind the most famous squirrel on Solana. Bonding curve at 67%.",  mcap: "$892K",  vol: "$234K",  holders: 4821,  grad: 67,  distPct: 0,  up: true,  change: "+89.4%",  replies: 2104,  age: "3h",  creator: "3mLx...vQ7r", badgeType: null },
  { ticker: "FWOG",     name: "Fwog",                 avatar: 3, img: `${DSX}/A8C3xuqscfmyLrte3VVY3lbEqSCsSY29iFcgICeCkEVj.png`,  desc: "Created by 9kRt...mN2w. The friendliest frog on Solana. Community art + memes. Graduating soon — 91% to target.",                mcap: "$3.1M",  vol: "$1.1M",  holders: 8920,  grad: 91,  distPct: 0,  up: true,  change: "+34.7%",  replies: 1823,  age: "1d",  creator: "9kRt...mN2w", badgeType: "graduating" },
  { ticker: "BRETT",    name: "Brett",                avatar: 4, img: `${DSX}/BRETTqEfmoLAdpMp5MHSomn3VNELeuF3tcRGR6SYFRSr.png`, desc: "Created by 2hNx...pK5t. Based Brett from Boy's Club. Multi-chain meme legend arrives on Solana via BondIt. Flight mode active.",  mcap: "$156M",  vol: "$12.3M", holders: 42100, grad: 100, distPct: 88, up: false, change: "-3.2%",   replies: 8921,  age: "5d",  creator: "2hNx...pK5t", badgeType: "flight" },
  { ticker: "GOAT",     name: "Goatseus Maximus",     avatar: 5, img: `${DSX}/CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump.png`, desc: "Created by 6wQp...nR4k. AI-generated memecoin phenomenon. First token launched through truth terminal narrative.",                mcap: "$412K",  vol: "$89K",   holders: 2103,  grad: 48,  distPct: 0,  up: true,  change: "+12.1%",  replies: 567,   age: "45m", creator: "6wQp...nR4k", badgeType: null },
  { ticker: "MOTHER",   name: "MOTHER IGGY",          avatar: 6, img: `${DSX}/3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN.png`,  desc: "Created by 8jLm...tH9v. Iggy Azalea's community token. Celebrity-backed with transparent agency stewardship.",                    mcap: "$67.8M", vol: "$8.9M",  holders: 19204, grad: 100, distPct: 19, up: true,  change: "+67.3%",  replies: 5612,  age: "3d",  creator: "8jLm...tH9v", badgeType: "graduated" },
  { ticker: "NEIRO",    name: "Neiro",                avatar: 7, img: `${DSX}/HiTzQWDFMwp9aHgFEBFapWP4gNmV3oMGAagVdJDthpump.png`, desc: "Created by 5tKx...jQ2m. New Doge's sibling. The Kabosu successor meme. Community stewardship — 83% to graduation.",              mcap: "$1.8M",  vol: "$423K",  holders: 6801,  grad: 83,  distPct: 0,  up: true,  change: "+23.8%",  replies: 934,   age: "6h",  creator: "5tKx...jQ2m", badgeType: "graduating" },
  { ticker: "POCHITA",  name: "Pochita",              avatar: 0,                                                                       desc: "Created by 1nRw...kM8p. Chainsaw Man's devil dog comes to Solana. Anime community backing. Early bonding curve phase.",          mcap: "$312K",  vol: "$67K",   holders: 1847,  grad: 34,  distPct: 0,  up: true,  change: "+412%",   replies: 723,   age: "20m", creator: "1nRw...kM8p", badgeType: null },
  { ticker: "PONKE",    name: "Ponke",                avatar: 1, img: `${DSX}/5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC.png`,  desc: "Created by 4hJk...nL3r. Degenerate monkey PFP turned memecoin. Agency stewarded launch with 99/1 fee split.",                   mcap: "$23.4M", vol: "$3.4M",  holders: 11200, grad: 100, distPct: 27, up: false, change: "-8.1%",   replies: 4201,  age: "4d",  creator: "4hJk...nL3r", badgeType: "graduated" },
  { ticker: "CHILLGUY", name: "Just a chill guy",     avatar: 2, img: `${DSX}/Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump.png`,  desc: "Created by 7mNp...tK9w. No utility. No roadmap. Just vibes. Community gathered around peak chill energy. Bonding at 56%.",     mcap: "$534K",  vol: "$112K",  holders: 3201,  grad: 56,  distPct: 0,  up: true,  change: "+18.9%",  replies: 445,   age: "1h",  creator: "7mNp...tK9w", badgeType: null },
  { ticker: "HARAMBE",  name: "Harambe",              avatar: 3, img: `${DSX}/Fch1oixTPri8zxBnmdCEADoJW2toyFHxqGZacQkzFvHz.png`,  desc: "Created by 2pQw...jR6t. Never forget. OG meme brought to Solana with agency-backed stewardship. Flight mode imminent.",        mcap: "$8.9M",  vol: "$2.1M",  holders: 14800, grad: 100, distPct: 76, up: true,  change: "+5.4%",   replies: 3102,  age: "2d",  creator: "2pQw...jR6t", badgeType: "flight" },
];

export const TABS = ["Trending", "New", "Graduating", "Graduated", "Flight Mode"] as const;
export type DiscoveryTab = (typeof TABS)[number];

export const INTRO_PAGES = [
  {
    title: "Every Token Gets Its Own Agency",
    desc: "BondIt assigns every launch a dedicated autonomous Agent — not a shared service, not a team. A per-token program that manages LP, compounds fees, and guides your token to community independence.",
  },
  {
    title: "How It Works",
    desc: "70% bonding curve → Graduate at 85 SOL → Your Agency manages LP compounding, treasury releases, and flight-readiness checks → At 15K holders the Agency dissolves and the community takes full control.",
  },
  {
    title: "Fully Transparent",
    desc: "Every Agency action is logged on-chain with an immutable charter. 70/20/10 fee split (LP/house/referral). No admin keys. No discretion. Publicly verifiable forever.",
  },
] as const;

function ageToMinutes(age: string): number {
  const value = Number.parseInt(age, 10);
  if (Number.isNaN(value)) return Number.MAX_SAFE_INTEGER;
  if (age.endsWith("m")) return value;
  if (age.endsWith("h")) return value * 60;
  if (age.endsWith("d")) return value * 1440;
  return Number.MAX_SAFE_INTEGER;
}

function engagementScore(token: DiscoveryToken): number {
  return token.replies * 2 + token.holders + token.grad * 50;
}

export function filterDiscoveryTokens(tokens: DiscoveryToken[], search: string, tab: DiscoveryTab): DiscoveryToken[] {
  const normalizedSearch = search.trim().toLowerCase();

  const searched = normalizedSearch
    ? tokens.filter((token) => token.ticker.toLowerCase().includes(normalizedSearch) || token.name.toLowerCase().includes(normalizedSearch))
    : tokens;

  switch (tab) {
    case "New":
      return [...searched].sort((a, b) => ageToMinutes(a.age) - ageToMinutes(b.age));
    case "Graduating":
      return searched.filter((token) => token.badgeType === "graduating" || (token.grad >= 75 && token.grad < 100));
    case "Graduated":
      return searched.filter((token) => token.badgeType === "graduated");
    case "Flight Mode":
      return searched.filter((token) => token.badgeType === "flight");
    case "Trending":
    default:
      return [...searched].sort((a, b) => engagementScore(b) - engagementScore(a));
  }
}
