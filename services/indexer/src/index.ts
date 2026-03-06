import express, { Request, Response, NextFunction } from "express";
import { Connection } from "@solana/web3.js";
import * as dotenv from "dotenv";
import { EventListener } from "./listener";
import { ApiRouter } from "./api";
import { logger } from "./logger";

dotenv.config();

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

async function main() {
  logger.info("BondIt.lol Indexer starting...");

  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const wsUrl = process.env.SOLANA_WS_URL || "wss://api.mainnet-beta.solana.com";
  const port = parsePort(process.env.INDEXER_PORT || process.env.PORT, 3001);
  const allowedOrigins = getAllowedOrigins();
  const rateLimitWindowMs = parsePositiveInt(process.env.INDEXER_RATE_LIMIT_WINDOW_MS, 60_000);
  const rateLimitMaxRequests = parsePositiveInt(process.env.INDEXER_RATE_LIMIT_MAX_REQUESTS, 120);

  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
    wsEndpoint: wsUrl,
  });

  // Start event listener (subscribes to program logs)
  const listener = new EventListener(connection);
  await listener.start();

  // Start API server
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "128kb" }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (applyCors(req, res, allowedOrigins)) {
      return;
    }
    next();
  });
  app.use(createRateLimiter(rateLimitWindowMs, rateLimitMaxRequests));

  const apiRouter = new ApiRouter(connection);
  app.use("/api", apiRouter.getRouter());

  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  app.listen(port, () => {
    logger.info(`Indexer API listening on port ${port}`);
  });
}

main().catch((err) => {
  logger.error({ err }, "Indexer fatal error");
  process.exit(1);
});
