import express, { Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import { ReportGenerator } from "./reports";
import { AnomalyDetector } from "./anomaly";
import { QueryHandler } from "./queries";
import { resolveTeamProvider, parseByokHeaders } from "./providers";
import { CreditTracker } from "./credits";
import { logger } from "./logger";
import { getSkillStatuses, logSkillStatuses } from "./skills";

dotenv.config();

const LAUNCH_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getAllowedOrigins(): Set<string> {
  const configured = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return new Set(configured);
  }

  return new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);
}

function getRequestIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  }

  return req.socket.remoteAddress || "unknown";
}

function createRateLimiter(windowMs: number, maxRequests: number) {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${getRequestIp(req)}:${req.path}`;
    const entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "Rate limit exceeded" });
      return;
    }

    entry.count += 1;
    next();
  };
}

function applyCors(req: Request, res: Response, allowedOrigins: Set<string>): boolean {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-AI-Provider, X-AI-API-Key");
  }

  if (req.method === "OPTIONS") {
    res.status(origin && allowedOrigins.has(origin) ? 204 : 403).end();
    return true;
  }

  return false;
}

function isValidLaunchId(value: string): boolean {
  return LAUNCH_ID_PATTERN.test(value);
}

function normalizeQuestion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return null;
  return trimmed;
}

async function main() {
  logger.info("BondIt.lol AI Advisory Service starting...");

  const port = parsePort(process.env.AI_PORT || process.env.PORT, 3002);
  const allowedOrigins = getAllowedOrigins();
  const rateLimitWindowMs = parsePositiveInt(process.env.AI_RATE_LIMIT_WINDOW_MS, 60_000);
  const rateLimitMaxRequests = parsePositiveInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS, 30);
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (applyCors(req, res, allowedOrigins)) {
      return;
    }
    next();
  });
  app.use(createRateLimiter(rateLimitWindowMs, rateLimitMaxRequests));

  const teamProvider = resolveTeamProvider();
  if (teamProvider) {
    logger.info(`Team AI provider: ${teamProvider.name}`);
  } else {
    logger.warn("No team AI provider configured — all requests will use grounded fallback unless BYOK headers are supplied");
  }

  // Log active skills on startup
  logSkillStatuses();

  const credits = new CreditTracker();
  const reports = new ReportGenerator();
  const anomaly = new AnomalyDetector();
  const queries = new QueryHandler(teamProvider, credits);

  type LaunchParams = { launchId: string };
  type QueryBody = { launchId?: string; question?: string };

  app.param("launchId", (_req: Request, res: Response, next: NextFunction, launchId: string) => {
    if (!isValidLaunchId(launchId)) {
      res.status(400).json({ error: "Invalid launchId" });
      return;
    }
    next();
  });

  // Generate transparency report for a launch
  app.post("/api/reports/daily/:launchId", async (req: Request<LaunchParams>, res: Response) => {
    try {
      const report = await reports.generateDailyReport(req.params.launchId);
      res.json(report);
    } catch (err) {
      logger.error({ err }, "Failed to generate daily report");
      res.status(500).json({ error: "Report generation failed" });
    }
  });

  app.post("/api/reports/weekly/:launchId", async (req: Request<LaunchParams>, res: Response) => {
    try {
      const report = await reports.generateWeeklyReport(req.params.launchId);
      res.json(report);
    } catch (err) {
      logger.error({ err }, "Failed to generate weekly report");
      res.status(500).json({ error: "Report generation failed" });
    }
  });

  // Anomaly detection
  app.post("/api/anomaly/scan/:launchId", async (req: Request<LaunchParams>, res: Response) => {
    try {
      const results = await anomaly.scan(req.params.launchId);
      res.json(results);
    } catch (err) {
      logger.error({ err }, "Anomaly scan failed");
      res.status(500).json({ error: "Scan failed" });
    }
  });

  // Community query endpoint (supports BYOK via X-AI-Provider + X-AI-API-Key headers)
  app.post("/api/query", async (req: Request<Record<string, never>, unknown, QueryBody>, res: Response) => {
    try {
      const launchId = typeof req.body.launchId === "string" ? req.body.launchId.trim() : "";
      const question = normalizeQuestion(req.body.question);
      if (!isValidLaunchId(launchId)) {
        res.status(400).json({ error: "Invalid launchId" });
        return;
      }
      if (!question) {
        res.status(400).json({ error: "Question must be a non-empty string up to 500 characters" });
        return;
      }

      const byok = parseByokHeaders(req.headers);
      const answer = await queries.handleQuery(launchId, question, byok);
      res.json(answer);
    } catch (err) {
      logger.error({ err }, "Query handling failed");
      res.status(500).json({ error: "Query failed" });
    }
  });

  // OpenClaw proxy endpoint (supports BYOK via X-AI-Provider + X-AI-API-Key headers)
  // Matches OpenAI's /v1/chat/completions schema so OpenClaw can use BondIt as a Custom Provider
  app.post("/v1/chat/completions", async (req: Request, res: Response) => {
    try {
      // 1. Extract the token launchId from the Bearer token
      // OpenClaw users will supply their BondIt token ID as the API key in OpenClaw config
      const authHeader = req.headers.authorization || "";
      const launchIdMatch = authHeader.match(/^Bearer\s+(.+)$/i);
      const launchId = launchIdMatch ? launchIdMatch[1].trim() : "";

      if (!isValidLaunchId(launchId)) {
        res.status(401).json({ error: { message: "Invalid or missing launchId in Authorization header. Use 'Bearer <launchId>'.", type: "invalid_request_error" } });
        return;
      }

      // 2. Extract the user's message from the OpenAI message array
      const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
      const lastUserMessage = messages.slice().reverse().find((m: any) => m.role === "user");
      const question = normalizeQuestion(lastUserMessage?.content);

      if (!question) {
        res.status(400).json({ error: { message: "No valid user message found", type: "invalid_request_error" } });
        return;
      }

      // 3. Check for BYOK headers
      const byok = parseByokHeaders(req.headers);

      // 4. Delegate to QueryHandler to build context and prompt the actual LLM
      const answer = await queries.handleQuery(launchId, question, byok);

      // 5. Build response — include credit alert as a system note if present
      const content = answer.creditAlert
        ? `${answer.answer}\n\n⚠️ ${answer.creditAlert}\n\n_${answer.disclaimer}_`
        : `${answer.answer}\n\n_${answer.disclaimer}_`;

      // 6. Return in standard OpenAI format
      res.json({
        id: `chatcmpl-${answer.promptHash}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: answer.modelId,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content,
            },
            finish_reason: "stop"
          }
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        // BondIt extension: tier and credit info
        bondit: {
          tier: answer.tier,
          creditAlert: answer.creditAlert ?? null,
        },
      });
    } catch (err) {
      logger.error({ err }, "OpenClaw proxy chat completion failed");
      res.status(500).json({ error: { message: "Internal server error", type: "server_error" } });
    }
  });

  // ── Credit status & alerts ──────────────────────────────────────────────

  // GET /api/credits/status — check team AI credit status
  app.get("/api/credits/status", (_req: Request, res: Response) => {
    res.json(credits.getStatus());
  });

  // GET /api/credits/alerts — get recent credit alerts (optionally filter by launchId)
  app.get("/api/credits/alerts", (req: Request, res: Response) => {
    const launchId = typeof req.query.launchId === "string" ? req.query.launchId.trim() : undefined;
    res.json({ alerts: credits.getAlerts(launchId) });
  });

  // GET /api/credits/spend — get recent spend log
  app.get("/api/credits/spend", (_req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, Number((_req.query as any).limit) || 50));
    res.json({ spend: credits.getSpendLog(limit) });
  });

  // ── Skills & Intelligence ────────────────────────────────────────────────

  // GET /api/skills — list all available intelligence skills and their status
  app.get("/api/skills", (_req: Request, res: Response) => {
    res.json({ skills: getSkillStatuses() });
  });

  // POST /api/risk/wallet — score a wallet address for risk
  app.post("/api/risk/wallet", async (req: Request, res: Response) => {
    try {
      const address = typeof req.body.address === "string" ? req.body.address.trim() : "";
      if (!address || address.length < 32 || address.length > 44) {
        res.status(400).json({ error: "Invalid Solana address" });
        return;
      }
      const report = await anomaly.scoreWallet(address);
      res.json(report);
    } catch (err) {
      logger.error({ err }, "Wallet risk scoring failed");
      res.status(500).json({ error: "Risk scoring failed" });
    }
  });

  // Health
  app.get("/health", (_req: Request, res: Response) => {
    const creditStatus = credits.getStatus();
    res.json({
      status: "ok",
      role: "advisory_only",
      teamProvider: teamProvider?.name ?? "none",
      credits: {
        exhausted: creditStatus.exhausted,
        remainingPct: creditStatus.totalBudgetTokens > 0
          ? ((creditStatus.remainingTokens / creditStatus.totalBudgetTokens) * 100).toFixed(1)
          : "0",
      },
      timestamp: Date.now(),
    });
  });

  app.listen(port, () => {
    logger.info(`BondIt.lol AI listening on port ${port}`);
  });
}

main().catch((err) => {
  logger.error({ err }, "BondIt.lol AI fatal error");
  process.exit(1);
});
