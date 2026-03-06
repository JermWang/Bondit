import express, { Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import { ReportGenerator } from "./reports";
import { AnomalyDetector } from "./anomaly";
import { QueryHandler } from "./queries";
import { resolveProvider } from "./providers";
import { logger } from "./logger";

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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

  const aiProvider = resolveProvider();
  const reports = new ReportGenerator();
  const anomaly = new AnomalyDetector();
  const queries = new QueryHandler(aiProvider);

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

  // Community query endpoint
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

      const answer = await queries.handleQuery(launchId, question);
      res.json(answer);
    } catch (err) {
      logger.error({ err }, "Query handling failed");
      res.status(500).json({ error: "Query failed" });
    }
  });

  // Health
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", role: "advisory_only", timestamp: Date.now() });
  });

  app.listen(port, () => {
    logger.info(`BondIt.lol AI listening on port ${port}`);
  });
}

main().catch((err) => {
  logger.error({ err }, "BondIt.lol AI fatal error");
  process.exit(1);
});
