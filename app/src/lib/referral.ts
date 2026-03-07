/**
 * Referral tracking utilities.
 * - Captures ?ref= from URL on first visit
 * - Stores referral code in localStorage
 * - Sends attribution to API when wallet connects
 * - Provides helpers for the referral dashboard
 */

const STORAGE_KEY = "bondit:ref-code";
const ATTRIBUTED_KEY = "bondit:ref-attributed";

const API_BASE =
  process.env.NEXT_PUBLIC_INDEXER_API_URL ?? "http://localhost:4400/api";

// ── Capture & Storage ──────────────────────────────────────────────────────

/** Call on app mount to capture ?ref= from URL */
export function captureReferralCode(): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const code = params.get("ref");

  if (code && code.length >= 4 && code.length <= 16) {
    // Only store if we don't already have one (first touch wins)
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, code);
    }

    // Clean URL without reload
    if (window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.toString());
    }

    return code;
  }

  return localStorage.getItem(STORAGE_KEY);
}

/** Get the stored referral code (if any) */
export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

/** Check if this wallet has already been attributed */
export function isAlreadyAttributed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ATTRIBUTED_KEY) === "1";
}

// ── Attribution ────────────────────────────────────────────────────────────

/**
 * Send referral attribution when a wallet connects.
 * Only fires once per browser — idempotent on the backend too.
 */
export async function sendAttribution(walletAddress: string): Promise<boolean> {
  if (isAlreadyAttributed()) return false;

  const code = getStoredReferralCode();
  if (!code) return false;

  try {
    const res = await fetch(`${API_BASE}/referral/attribute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referee_wallet: walletAddress, code }),
    });

    if (res.ok) {
      localStorage.setItem(ATTRIBUTED_KEY, "1");
      return true;
    }

    // 400/404/429 are expected non-retry errors
    if (res.status >= 400 && res.status < 500) {
      localStorage.setItem(ATTRIBUTED_KEY, "1"); // Don't retry
    }

    return false;
  } catch {
    // Network error — will retry next session
    return false;
  }
}

// ── API Helpers ────────────────────────────────────────────────────────────

export interface ReferralStats {
  wallet: string;
  code: string;
  referral_link: string;
  total_referrals: number;
  active_referees: number;
  total_earned_lamports: string;
  earned_24h_lamports: string;
  earned_7d_lamports: string;
  total_paid_lamports: string;
  pending_balance_lamports: string;
  total_trades_referred: number;
}

export interface ReferralEarning {
  referee_wallet: string;
  launch_id: string;
  trade_tx: string;
  tier: number;
  fee_lamports: string;
  earned_lamports: string;
  created_at: string;
}

/** Fetch or create a referral code for this wallet */
export async function fetchOrCreateCode(wallet: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/referral/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.code ?? null;
  } catch {
    return null;
  }
}

/** Fetch referral dashboard stats */
export async function fetchReferralStats(wallet: string): Promise<ReferralStats | null> {
  try {
    const res = await fetch(`${API_BASE}/referral/stats/${wallet}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Fetch referral earnings history */
export async function fetchReferralEarnings(
  wallet: string,
  limit = 50,
  offset = 0,
): Promise<{ earnings: ReferralEarning[]; totals: { total_earned_lamports: string; total_trades: number; unique_referees: number } } | null> {
  try {
    const res = await fetch(`${API_BASE}/referral/earnings/${wallet}?limit=${limit}&offset=${offset}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Format lamports to SOL with decimals */
export function lamportsToSol(lamports: string | number, decimals = 4): string {
  const val = Number(lamports) / 1_000_000_000;
  return val.toFixed(decimals);
}
