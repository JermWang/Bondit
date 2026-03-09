import { logger } from "./logger";

/**
 * CreditTracker — tracks team-funded AI spend and enforces budget limits.
 *
 * When team credits are exhausted:
 *   1. AI falls back to grounded (indexer-only) responses
 *   2. An alert is emitted for the token so the frontend can show a notification
 *
 * Budget resets daily at midnight UTC by default (configurable).
 */

export interface CreditStatus {
  remainingTokens: number;
  totalBudgetTokens: number;
  usedTokens: number;
  exhausted: boolean;
  resetsAt: number;
}

export interface SpendRecord {
  launchId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: number;
}

export interface CreditAlert {
  launchId: string;
  type: "credits_exhausted" | "credits_low" | "credits_restored";
  message: string;
  timestamp: number;
  fallbackActive: boolean;
}

const DEFAULT_DAILY_TOKEN_BUDGET = 500_000; // ~500K tokens/day team budget
const LOW_CREDIT_THRESHOLD_PCT = 10; // Alert at 10% remaining

export class CreditTracker {
  private dailyBudget: number;
  private usedTokens: number = 0;
  private resetAt: number;
  private alerts: CreditAlert[] = [];
  private spendLog: SpendRecord[] = [];
  private exhaustedLaunches: Set<string> = new Set();

  constructor(dailyBudget?: number) {
    this.dailyBudget = dailyBudget ?? parsePositiveInt(process.env.AI_DAILY_TOKEN_BUDGET, DEFAULT_DAILY_TOKEN_BUDGET);
    this.resetAt = nextMidnightUTC();
    logger.info({ dailyBudget: this.dailyBudget, resetsAt: new Date(this.resetAt).toISOString() }, "CreditTracker initialized");
  }

  /** Check if team credits are available before making an LLM call */
  hasCredits(): boolean {
    this.maybeReset();
    return this.usedTokens < this.dailyBudget;
  }

  /** Get current credit status */
  getStatus(): CreditStatus {
    this.maybeReset();
    const remaining = Math.max(0, this.dailyBudget - this.usedTokens);
    return {
      remainingTokens: remaining,
      totalBudgetTokens: this.dailyBudget,
      usedTokens: this.usedTokens,
      exhausted: remaining <= 0,
      resetsAt: this.resetAt,
    };
  }

  /** Record token spend after an LLM call */
  recordSpend(launchId: string, provider: string, model: string, inputTokens: number, outputTokens: number): void {
    this.maybeReset();

    const totalTokens = inputTokens + outputTokens;
    this.usedTokens += totalTokens;

    this.spendLog.push({
      launchId,
      provider,
      model,
      inputTokens,
      outputTokens,
      timestamp: Date.now(),
    });

    // Trim spend log to last 1000 entries (memory-bounded)
    if (this.spendLog.length > 1000) {
      this.spendLog = this.spendLog.slice(-500);
    }

    const remaining = Math.max(0, this.dailyBudget - this.usedTokens);
    const remainingPct = (remaining / this.dailyBudget) * 100;

    logger.info({
      launchId,
      provider,
      model,
      tokens: totalTokens,
      usedTotal: this.usedTokens,
      remainingPct: remainingPct.toFixed(1),
    }, "CreditTracker: spend recorded");

    // Check for low credits
    if (remainingPct <= LOW_CREDIT_THRESHOLD_PCT && remainingPct > 0) {
      this.emitAlert(launchId, "credits_low",
        `Team AI credits are low (${remainingPct.toFixed(0)}% remaining). Responses may fall back to grounded mode soon.`,
        false);
    }

    // Check for exhaustion
    if (remaining <= 0 && !this.exhaustedLaunches.has("__global__")) {
      this.exhaustedLaunches.add("__global__");
      this.emitAlert(launchId, "credits_exhausted",
        "Team AI credits exhausted for today. All tokens are now using grounded (indexer-only) responses. Credits reset at midnight UTC. Users with their own API keys are unaffected.",
        true);
    }
  }

  /** Get alerts for a specific launch or all alerts */
  getAlerts(launchId?: string): CreditAlert[] {
    if (launchId) {
      return this.alerts.filter((a) => a.launchId === launchId || a.launchId === "__global__");
    }
    return [...this.alerts];
  }

  /** Get recent spend records */
  getSpendLog(limit: number = 50): SpendRecord[] {
    return this.spendLog.slice(-limit);
  }

  /** Check if a specific launch has been notified of credit exhaustion */
  isExhaustedForLaunch(launchId: string): boolean {
    this.maybeReset();
    return !this.hasCredits();
  }

  private emitAlert(launchId: string, type: CreditAlert["type"], message: string, fallbackActive: boolean): void {
    const alert: CreditAlert = {
      launchId,
      type,
      message,
      timestamp: Date.now(),
      fallbackActive,
    };

    this.alerts.push(alert);

    // Keep alerts bounded
    if (this.alerts.length > 200) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn({ launchId, type, fallbackActive }, `CreditTracker: ${message}`);
  }

  private maybeReset(): void {
    const now = Date.now();
    if (now >= this.resetAt) {
      const previousUsed = this.usedTokens;
      this.usedTokens = 0;
      this.resetAt = nextMidnightUTC();
      this.exhaustedLaunches.clear();

      if (previousUsed > 0) {
        this.emitAlert("__global__", "credits_restored",
          `Team AI credits have been restored. Daily budget: ${this.dailyBudget.toLocaleString()} tokens.`,
          false);
      }

      logger.info({
        previousUsed,
        newResetAt: new Date(this.resetAt).toISOString(),
      }, "CreditTracker: daily budget reset");
    }
  }
}

function nextMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.getTime();
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
