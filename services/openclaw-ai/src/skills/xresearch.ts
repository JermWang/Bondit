import { logger } from "../logger";

// ── X/Twitter Research Skill ────────────────────────────────────────────────
// Sentiment monitoring and social intelligence for token launches.
// Based on: https://github.com/rohunvora/x-research-skill
// Uses X API v2 (Bearer token required).

const BASE_URL = "https://api.twitter.com/2";

export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername?: string;
  createdAt: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
  };
}

export interface SentimentSummary {
  query: string;
  tweetCount: number;
  tweets: Tweet[];
  fetchedAt: number;
}

function getBearerToken(): string | null {
  return process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || null;
}

async function xGet<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const token = getBearerToken();
  if (!token) {
    logger.debug("X Research: no bearer token configured, skipping");
    return null;
  }

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }

  try {
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      logger.warn({ status: resp.status, path }, "X Research: API error");
      return null;
    }

    return (await resp.json()) as T;
  } catch (err) {
    logger.warn({ err, path }, "X Research: request failed");
    return null;
  }
}

/**
 * Search recent tweets mentioning a token or topic.
 * Uses X API v2 search/recent (requires at least Basic tier).
 */
export async function searchTweets(query: string, maxResults = 10): Promise<SentimentSummary | null> {
  type XSearchResponse = {
    data?: Array<{
      id: string;
      text: string;
      author_id: string;
      created_at: string;
      public_metrics?: {
        like_count: number;
        retweet_count: number;
        reply_count: number;
        impression_count: number;
      };
    }>;
    includes?: {
      users?: Array<{ id: string; username: string }>;
    };
  };

  const result = await xGet<XSearchResponse>("/tweets/search/recent", {
    query: `${query} -is:retweet lang:en`,
    max_results: String(Math.min(100, Math.max(10, maxResults))),
    "tweet.fields": "created_at,public_metrics,author_id",
    "user.fields": "username",
    expansions: "author_id",
  });

  if (!result?.data) return null;

  const userMap = new Map<string, string>();
  for (const u of result.includes?.users ?? []) {
    userMap.set(u.id, u.username);
  }

  const tweets: Tweet[] = result.data.map((t) => ({
    id: t.id,
    text: t.text,
    authorId: t.author_id,
    authorUsername: userMap.get(t.author_id),
    createdAt: t.created_at,
    metrics: {
      likes: t.public_metrics?.like_count ?? 0,
      retweets: t.public_metrics?.retweet_count ?? 0,
      replies: t.public_metrics?.reply_count ?? 0,
      impressions: t.public_metrics?.impression_count ?? 0,
    },
  }));

  // Sort by engagement (likes + retweets)
  tweets.sort((a, b) =>
    (b.metrics.likes + b.metrics.retweets) - (a.metrics.likes + a.metrics.retweets)
  );

  return {
    query,
    tweetCount: tweets.length,
    tweets,
    fetchedAt: Date.now(),
  };
}

/**
 * Search for tweets about a specific token by symbol.
 * Adds crypto-specific filters.
 */
export async function searchTokenSentiment(symbol: string, maxResults = 20): Promise<SentimentSummary | null> {
  return searchTweets(`$${symbol} OR "${symbol}" (crypto OR token OR solana OR launch)`, maxResults);
}

export function isConfigured(): boolean {
  return !!getBearerToken();
}
