import { NextRequest, NextResponse } from "next/server";

/**
 * Generic keeper cron proxy.
 * Triggers keeper jobs by calling the indexer/keeper API.
 * 
 * Usage:
 *   GET /api/cron/keeper?job=monitor
 *   GET /api/cron/keeper?job=execute
 *   GET /api/cron/keeper?job=flight-check
 * 
 * For Vercel cron: configure in vercel.json
 * For cron-jobs.org: hit this URL with Authorization: Bearer <CRON_SECRET>
 */

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const KEEPER_API_URL = process.env.KEEPER_API_URL ?? "";

function isAuthorized(req: NextRequest): boolean {
  const vercelHeader = req.headers.get("x-vercel-cron-secret");
  if (vercelHeader && vercelHeader === CRON_SECRET) return true;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${CRON_SECRET}`) return true;

  return false;
}

const VALID_JOBS = ["monitor", "execute", "compound", "flight-check"] as const;
type JobName = (typeof VALID_JOBS)[number];

export async function GET(req: NextRequest) {
  if (!CRON_SECRET || !isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const job = searchParams.get("job") as JobName | null;

  if (!job || !VALID_JOBS.includes(job)) {
    return NextResponse.json(
      { error: `Invalid job. Valid: ${VALID_JOBS.join(", ")}` },
      { status: 400 },
    );
  }

  if (!KEEPER_API_URL) {
    return NextResponse.json(
      { error: "KEEPER_API_URL not configured" },
      { status: 503 },
    );
  }

  try {
    console.log(`[cron/keeper] Triggering job: ${job}`);

    const res = await fetch(`${KEEPER_API_URL}/trigger/${job}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      signal: AbortSignal.timeout(55_000), // Vercel functions timeout at 60s
    });

    const data = await res.json().catch(() => ({ status: res.status }));
    console.log(`[cron/keeper] Job ${job} responded: ${res.status}`);

    return NextResponse.json({
      status: "ok",
      job,
      keeper_status: res.status,
      result: data,
    });
  } catch (err) {
    console.error(`[cron/keeper] Job ${job} failed:`, err);
    return NextResponse.json(
      { error: "Keeper request failed", job },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
