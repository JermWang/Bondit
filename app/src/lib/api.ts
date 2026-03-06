import type {
  ApiErrorResponse,
  LaunchesResponse,
  LaunchCurveResponse,
  LaunchTradesResponse,
  LaunchCharterResponse,
  LaunchTreasuryResponse,
  LaunchHolderStatsResponse,
  LaunchLiquidityStatsResponse,
  LaunchFlightStatusResponse,
  LaunchFeeBreakdownResponse,
  LaunchDashboardResponse,
  TransparencyReport,
  QueryResponse,
} from "@bondit/sdk/api";

const INDEXER_API_BASE = process.env.NEXT_PUBLIC_INDEXER_API_URL ?? "http://localhost:3001/api";
const AI_API_BASE = process.env.NEXT_PUBLIC_AI_API_URL ?? "http://localhost:3002/api";

function encodeLaunchId(launchId: string): string {
  return encodeURIComponent(launchId);
}

function toBoundedInt(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export class ApiClientError extends Error {
  status: number;
  payload?: ApiErrorResponse;

  constructor(message: string, status: number, payload?: ApiErrorResponse) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const isJson = response.headers.get("content-type")?.includes("application/json") ?? false;
  const payload = isJson ? ((await response.json()) as T | ApiErrorResponse) : undefined;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorResponse | undefined;
    throw new ApiClientError(errorPayload?.error ?? `Request failed with status ${response.status}`, response.status, errorPayload);
  }

  return payload as T;
}

export async function getLaunches(): Promise<LaunchesResponse> {
  return fetchJson<LaunchesResponse>(`${INDEXER_API_BASE}/launches`);
}

export async function getLaunchCurve(launchId: string): Promise<LaunchCurveResponse> {
  return fetchJson<LaunchCurveResponse>(`${INDEXER_API_BASE}/launches/${encodeLaunchId(launchId)}/curve`);
}

export async function getLaunchTrades(launchId: string, limit = 50, offset = 0): Promise<LaunchTradesResponse> {
  const safeLimit = toBoundedInt(limit, 50, 1, 100);
  const safeOffset = toBoundedInt(offset, 0, 0, 10_000);
  return fetchJson<LaunchTradesResponse>(`${INDEXER_API_BASE}/launches/${encodeLaunchId(launchId)}/trades?limit=${safeLimit}&offset=${safeOffset}`);
}

export async function getLaunchCharter(launchId: string): Promise<LaunchCharterResponse> {
  return fetchJson<LaunchCharterResponse>(`${INDEXER_API_BASE}/launches/${encodeLaunchId(launchId)}/charter`);
}

export async function getLaunchTreasury(launchId: string): Promise<LaunchTreasuryResponse> {
  return fetchJson<LaunchTreasuryResponse>(`${INDEXER_API_BASE}/launches/${encodeLaunchId(launchId)}/treasury`);
}

export async function getLaunchHolders(launchId: string): Promise<LaunchHolderStatsResponse> {
  return fetchJson<LaunchHolderStatsResponse>(`${INDEXER_API_BASE}/launches/${encodeLaunchId(launchId)}/holders`);
}

export async function getLaunchLiquidity(launchId: string): Promise<LaunchLiquidityStatsResponse> {
  return fetchJson<LaunchLiquidityStatsResponse>(`${INDEXER_API_BASE}/launches/${encodeLaunchId(launchId)}/liquidity`);
}

export async function getLaunchFlightStatus(launchId: string): Promise<LaunchFlightStatusResponse> {
  return fetchJson<LaunchFlightStatusResponse>(`${INDEXER_API_BASE}/launches/${encodeLaunchId(launchId)}/flight-status`);
}

export async function getLaunchFees(launchId: string): Promise<LaunchFeeBreakdownResponse> {
  return fetchJson<LaunchFeeBreakdownResponse>(`${INDEXER_API_BASE}/launches/${encodeLaunchId(launchId)}/fees`);
}

export async function getLaunchDashboard(launchId: string): Promise<LaunchDashboardResponse> {
  return fetchJson<LaunchDashboardResponse>(`${INDEXER_API_BASE}/launches/${encodeLaunchId(launchId)}/dashboard`);
}

export async function getDailyReport(launchId: string): Promise<TransparencyReport> {
  return fetchJson<TransparencyReport>(`${AI_API_BASE}/reports/daily/${encodeLaunchId(launchId)}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getWeeklyReport(launchId: string): Promise<TransparencyReport> {
  return fetchJson<TransparencyReport>(`${AI_API_BASE}/reports/weekly/${encodeLaunchId(launchId)}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function askLaunchQuestion(launchId: string, question: string): Promise<QueryResponse> {
  return fetchJson<QueryResponse>(`${AI_API_BASE}/query`, {
    method: "POST",
    body: JSON.stringify({ launchId, question }),
  });
}
