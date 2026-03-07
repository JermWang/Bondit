import { Router, Request, Response, NextFunction } from "express";
import { Connection } from "@solana/web3.js";
import { logger } from "./logger";
import { IndexerReadModel } from "./read-model";
import { getDatabasePool } from "./db/client";

const LAUNCH_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * API Router for the Indexer service.
 * Exposes endpoints for the Transparency Dashboard and frontend.
 */
export class ApiRouter {
  private router: Router;
  private readModel: IndexerReadModel;

  constructor(private connection: Connection) {
    this.router = Router();
    this.readModel = new IndexerReadModel();
    this.setupRoutes();
  }

  getRouter(): Router {
    return this.router;
  }

  private respondNotFound(res: Response, launchId: string, resource: string): void {
    res.status(404).json({ error: `${resource} not found`, details: launchId });
  }

  private parseBoundedInt(value: unknown, fallback: number, min: number, max: number): number {
    const source = typeof value === "string" ? value : "";
    const parsed = Number.parseInt(source, 10);
    if (!Number.isInteger(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
  }

  private setupRoutes(): void {
    this.router.param("launchId", (_req: Request, res: Response, next: NextFunction, launchId: string) => {
      if (!LAUNCH_ID_PATTERN.test(launchId)) {
        res.status(400).json({ error: "Invalid launchId" });
        return;
      }
      next();
    });

    // Launch info
    this.router.get("/launches", this.getLaunches.bind(this));
    this.router.get("/launches/:launchId", this.getLaunchById.bind(this));

    // Curve data
    this.router.get("/launches/:launchId/curve", this.getCurveData.bind(this));
    this.router.get("/launches/:launchId/trades", this.getTrades.bind(this));

    // Stewardship data
    this.router.get("/launches/:launchId/charter", this.getCharter.bind(this));
    this.router.get("/launches/:launchId/treasury", this.getTreasuryStatus.bind(this));
    this.router.get("/launches/:launchId/policy-actions", this.getPolicyActions.bind(this));

    // Metrics
    this.router.get("/launches/:launchId/holders", this.getHolderStats.bind(this));
    this.router.get("/launches/:launchId/liquidity", this.getLiquidityStats.bind(this));
    this.router.get("/launches/:launchId/flight-status", this.getFlightStatus.bind(this));

    // Fees
    this.router.get("/launches/:launchId/fees", this.getFeeBreakdown.bind(this));

    // Dashboard aggregate
    this.router.get("/launches/:launchId/dashboard", this.getDashboard.bind(this));

    // Vanity backlog
    this.router.post("/vanity/claim", this.claimVanityKey.bind(this));
    this.router.get("/vanity/stats", this.getVanityStats.bind(this));

    // Referral system
    this.router.post("/referral/code", this.createReferralCode.bind(this));
    this.router.get("/referral/code/:wallet", this.getReferralCode.bind(this));
    this.router.get("/referral/resolve/:code", this.resolveReferralCode.bind(this));
    this.router.post("/referral/attribute", this.attributeReferral.bind(this));
    this.router.get("/referral/earnings/:wallet", this.getReferralEarnings.bind(this));
    this.router.get("/referral/stats/:wallet", this.getReferralStats.bind(this));
    this.router.post("/referral/record-trade", this.recordTradeEarning.bind(this));
  }

  private async getLaunches(_req: Request, res: Response): Promise<void> {
    try {
      const live = await this.readModel.listLaunches();
      res.json(live ?? { launches: [], total: 0 });
    } catch (err) {
      logger.error({ err }, "API: getLaunches failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getLaunchById(req: Request, res: Response): Promise<void> {
    try {
      const { launchId } = req.params;
      const live = await this.readModel.getLaunch(launchId);
      if (live) {
        res.json(live);
        return;
      }
      this.respondNotFound(res, launchId, "launch");
    } catch (err) {
      logger.error({ err }, "API: getLaunchById failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getCurveData(req: Request, res: Response): Promise<void> {
    try {
      const { launchId } = req.params;
      const live = await this.readModel.getCurve(launchId);
      if (live) {
        res.json(live);
        return;
      }
      this.respondNotFound(res, launchId, "curve state");
    } catch (err) {
      logger.error({ err }, "API: getCurveData failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getTrades(req: Request, res: Response): Promise<void> {
    try {
      const { launchId } = req.params;
      const limit = this.parseBoundedInt(req.query.limit, 50, 1, 100);
      const offset = this.parseBoundedInt(req.query.offset, 0, 0, 10_000);
      const live = await this.readModel.getTrades(launchId, limit, offset);
      if (live) {
        res.json(live);
        return;
      }
      this.respondNotFound(res, launchId, "trades");
    } catch (err) {
      logger.error({ err }, "API: getTrades failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getCharter(req: Request, res: Response): Promise<void> {
    try {
      const { launchId } = req.params;
      const live = await this.readModel.getCharter(launchId);
      if (live) {
        res.json(live);
        return;
      }
      this.respondNotFound(res, launchId, "charter");
    } catch (err) {
      logger.error({ err }, "API: getCharter failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getTreasuryStatus(req: Request, res: Response): Promise<void> {
    try {
      const { launchId } = req.params;
      const live = await this.readModel.getTreasury(launchId);
      if (live) {
        res.json(live);
        return;
      }
      this.respondNotFound(res, launchId, "treasury state");
    } catch (err) {
      logger.error({ err }, "API: getTreasuryStatus failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getPolicyActions(req: Request, res: Response): Promise<void> {
    try {
      const { launchId } = req.params;
      const limit = this.parseBoundedInt(req.query.limit, 50, 1, 100);
      const live = await this.readModel.getPolicyActions(launchId, limit);
      if (live) {
        res.json(live);
        return;
      }
      this.respondNotFound(res, launchId, "policy actions");
    } catch (err) {
      logger.error({ err }, "API: getPolicyActions failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getHolderStats(req: Request, res: Response): Promise<void> {
    try {
      const { launchId } = req.params;
      const live = await this.readModel.getHolders(launchId);
      if (live) {
        res.json(live);
        return;
      }
      this.respondNotFound(res, launchId, "holder stats");
    } catch (err) {
      logger.error({ err }, "API: getHolderStats failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getLiquidityStats(req: Request, res: Response): Promise<void> {
    try {
      const { launchId } = req.params;
      const live = await this.readModel.getLiquidity(launchId);
      if (live) {
        res.json(live);
        return;
      }
      this.respondNotFound(res, launchId, "liquidity stats");
    } catch (err) {
      logger.error({ err }, "API: getLiquidityStats failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getFlightStatus(req: Request, res: Response): Promise<void> {
    try {
      const { launchId } = req.params;
      const live = await this.readModel.getFlightStatus(launchId);
      if (live) {
        res.json(live);
        return;
      }
      this.respondNotFound(res, launchId, "flight status");
    } catch (err) {
      logger.error({ err }, "API: getFlightStatus failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getFeeBreakdown(req: Request, res: Response): Promise<void> {
    try {
      const { launchId } = req.params;
      const live = await this.readModel.getFees(launchId);
      if (live) {
        res.json(live);
        return;
      }
      this.respondNotFound(res, launchId, "fee breakdown");
    } catch (err) {
      logger.error({ err }, "API: getFeeBreakdown failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { launchId } = req.params;
      const live = await this.readModel.getDashboard(launchId);
      if (live) {
        res.json(live);
        return;
      }
      this.respondNotFound(res, launchId, "dashboard");
    } catch (err) {
      logger.error({ err }, "API: getDashboard failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // ── Vanity Backlog ─────────────────────────────────────────────────────

  private async claimVanityKey(req: Request, res: Response): Promise<void> {
    try {
      const pool = getDatabasePool();
      if (!pool) {
        res.status(503).json({ error: "Database not configured" });
        return;
      }

      const suffix = (req.body?.suffix as string) || "LoL";
      const claimedBy = (req.body?.claimedBy as string) || "unknown";

      // Atomic claim: pick the oldest unclaimed key and mark it claimed in one query
      const result = await pool.query(
        `UPDATE vanity_backlog
         SET claimed_at = NOW(), claimed_by = $2
         WHERE id = (
           SELECT id FROM vanity_backlog
           WHERE suffix = $1 AND claimed_at IS NULL
           ORDER BY id ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING idempotency_key, launch_id_hex, mint_address, suffix`,
        [suffix, claimedBy],
      );

      if (result.rows.length === 0) {
        res.status(503).json({
          error: "No vanity keys available",
          details: "The vanity backlog is empty. Try again shortly or grind locally.",
        });
        return;
      }

      const row = result.rows[0];
      res.json({
        idempotencyKey: row.idempotency_key,
        launchIdHex: row.launch_id_hex,
        mintAddress: row.mint_address,
        suffix: row.suffix,
      });
    } catch (err) {
      logger.error({ err }, "API: claimVanityKey failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async getVanityStats(_req: Request, res: Response): Promise<void> {
    try {
      const pool = getDatabasePool();
      if (!pool) {
        res.status(503).json({ error: "Database not configured" });
        return;
      }

      const result = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE claimed_at IS NULL)::int AS available,
           COUNT(*) FILTER (WHERE claimed_at IS NOT NULL)::int AS claimed,
           COUNT(*)::int AS total
         FROM vanity_backlog
         WHERE suffix = $1`,
        ["LoL"],
      );
      res.json(result.rows[0] ?? { available: 0, claimed: 0, total: 0 });
    } catch (err) {
      logger.error({ err }, "API: getVanityStats failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // ── Referral System ──────────────────────────────────────────────────────

  /** Generate a short alphanumeric code */
  private generateCode(length = 8): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let code = "";
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /** POST /api/referral/code — create or return existing code for a wallet */
  private async createReferralCode(req: Request, res: Response): Promise<void> {
    try {
      const pool = getDatabasePool();
      if (!pool) { res.status(503).json({ error: "Database not configured" }); return; }

      const wallet = req.body?.wallet as string;
      if (!wallet || wallet.length < 32 || wallet.length > 44) {
        res.status(400).json({ error: "Invalid wallet address" }); return;
      }

      // Return existing code if present
      const existing = await pool.query(
        `SELECT code, created_at FROM referral_codes WHERE wallet = $1`, [wallet],
      );
      if (existing.rows.length > 0) {
        res.json({ wallet, code: existing.rows[0].code, created_at: existing.rows[0].created_at });
        return;
      }

      // Generate unique code with retry
      let code = "";
      for (let attempt = 0; attempt < 5; attempt++) {
        code = this.generateCode();
        try {
          await pool.query(
            `INSERT INTO referral_codes (wallet, code) VALUES ($1, $2)`, [wallet, code],
          );
          break;
        } catch (e: any) {
          if (e.code === "23505" && attempt < 4) continue; // unique violation, retry
          throw e;
        }
      }

      res.json({ wallet, code, created_at: new Date().toISOString() });
    } catch (err) {
      logger.error({ err }, "API: createReferralCode failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /** GET /api/referral/code/:wallet — get code for a wallet */
  private async getReferralCode(req: Request, res: Response): Promise<void> {
    try {
      const pool = getDatabasePool();
      if (!pool) { res.status(503).json({ error: "Database not configured" }); return; }

      const { wallet } = req.params;
      const result = await pool.query(
        `SELECT code, created_at FROM referral_codes WHERE wallet = $1`, [wallet],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "No referral code found for this wallet" }); return;
      }

      res.json({ wallet, code: result.rows[0].code, created_at: result.rows[0].created_at });
    } catch (err) {
      logger.error({ err }, "API: getReferralCode failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /** GET /api/referral/resolve/:code — resolve a code to the referrer wallet */
  private async resolveReferralCode(req: Request, res: Response): Promise<void> {
    try {
      const pool = getDatabasePool();
      if (!pool) { res.status(503).json({ error: "Database not configured" }); return; }

      const { code } = req.params;
      const result = await pool.query(
        `SELECT wallet, created_at FROM referral_codes WHERE code = $1`, [code],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Invalid referral code" }); return;
      }

      res.json({ code, referrer_wallet: result.rows[0].wallet });
    } catch (err) {
      logger.error({ err }, "API: resolveReferralCode failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /** POST /api/referral/attribute — link a new user to their referrer (one-time) */
  private async attributeReferral(req: Request, res: Response): Promise<void> {
    try {
      const pool = getDatabasePool();
      if (!pool) { res.status(503).json({ error: "Database not configured" }); return; }

      const referee = req.body?.referee_wallet as string;
      const code = req.body?.code as string;
      if (!referee || !code) {
        res.status(400).json({ error: "referee_wallet and code are required" }); return;
      }

      // Resolve the code to a referrer
      const codeResult = await pool.query(
        `SELECT wallet FROM referral_codes WHERE code = $1`, [code],
      );
      if (codeResult.rows.length === 0) {
        res.status(404).json({ error: "Invalid referral code" }); return;
      }
      const referrer = codeResult.rows[0].wallet;

      // Can't self-refer
      if (referee === referrer) {
        res.status(400).json({ error: "Cannot refer yourself" }); return;
      }

      // Check if already attributed
      const existingAttr = await pool.query(
        `SELECT id FROM referral_attributions WHERE referee_wallet = $1`, [referee],
      );
      if (existingAttr.rows.length > 0) {
        res.json({ status: "already_attributed", referee_wallet: referee });
        return;
      }

      // Anti-gaming: max 50 attributions per referrer per day
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const rateCheck = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM referral_attributions
         WHERE referrer_wallet = $1 AND attributed_at >= $2`,
        [referrer, dayStart.toISOString()],
      );
      if ((rateCheck.rows[0]?.cnt ?? 0) >= 50) {
        res.status(429).json({ error: "Referrer has reached daily attribution limit" }); return;
      }

      // Insert direct attribution (tier 1)
      await pool.query(
        `INSERT INTO referral_attributions (referee_wallet, referrer_wallet, referrer_code, tier)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (referee_wallet) DO NOTHING`,
        [referee, referrer, code],
      );

      // Check for second-degree: was the referrer themselves referred by someone?
      const parentAttr = await pool.query(
        `SELECT referrer_wallet FROM referral_attributions WHERE referee_wallet = $1`, [referrer],
      );
      let secondDegreeReferrer: string | null = null;
      if (parentAttr.rows.length > 0) {
        secondDegreeReferrer = parentAttr.rows[0].referrer_wallet;
        // We don't insert a second attribution row for the referee — the 2nd-degree
        // relationship is computed at earnings time by tracing the chain.
      }

      res.json({
        status: "attributed",
        referee_wallet: referee,
        referrer_wallet: referrer,
        second_degree_referrer: secondDegreeReferrer,
      });
    } catch (err) {
      logger.error({ err }, "API: attributeReferral failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /** GET /api/referral/earnings/:wallet — get earnings history for a referrer */
  private async getReferralEarnings(req: Request, res: Response): Promise<void> {
    try {
      const pool = getDatabasePool();
      if (!pool) { res.status(503).json({ error: "Database not configured" }); return; }

      const { wallet } = req.params;
      const limit = this.parseBoundedInt(req.query.limit, 50, 1, 200);
      const offset = this.parseBoundedInt(req.query.offset, 0, 0, 10_000);

      const result = await pool.query(
        `SELECT referee_wallet, launch_id, trade_tx, tier,
                fee_lamports, earned_lamports, created_at
         FROM referral_earnings
         WHERE referrer_wallet = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [wallet, limit, offset],
      );

      // Totals
      const totals = await pool.query(
        `SELECT
           COALESCE(SUM(earned_lamports), 0)::bigint AS total_earned,
           COUNT(*)::int AS total_trades,
           COUNT(DISTINCT referee_wallet)::int AS unique_referees
         FROM referral_earnings
         WHERE referrer_wallet = $1`,
        [wallet],
      );

      res.json({
        wallet,
        earnings: result.rows,
        totals: {
          total_earned_lamports: totals.rows[0]?.total_earned?.toString() ?? "0",
          total_trades: totals.rows[0]?.total_trades ?? 0,
          unique_referees: totals.rows[0]?.unique_referees ?? 0,
        },
      });
    } catch (err) {
      logger.error({ err }, "API: getReferralEarnings failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /** GET /api/referral/stats/:wallet — dashboard stats for a referrer */
  private async getReferralStats(req: Request, res: Response): Promise<void> {
    try {
      const pool = getDatabasePool();
      if (!pool) { res.status(503).json({ error: "Database not configured" }); return; }

      const { wallet } = req.params;

      // Get or create code
      let codeRow = (await pool.query(
        `SELECT code FROM referral_codes WHERE wallet = $1`, [wallet],
      )).rows[0];

      if (!codeRow) {
        const code = this.generateCode();
        await pool.query(
          `INSERT INTO referral_codes (wallet, code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [wallet, code],
        );
        codeRow = { code };
      }

      // Referral counts
      const refCounts = await pool.query(
        `SELECT COUNT(*)::int AS total_referrals
         FROM referral_attributions WHERE referrer_wallet = $1`,
        [wallet],
      );

      // Earnings totals
      const earnings = await pool.query(
        `SELECT
           COALESCE(SUM(earned_lamports), 0)::bigint AS total_earned,
           COALESCE(SUM(earned_lamports) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'), 0)::bigint AS earned_24h,
           COALESCE(SUM(earned_lamports) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 0)::bigint AS earned_7d,
           COUNT(*)::int AS total_trades,
           COUNT(DISTINCT referee_wallet)::int AS active_referees
         FROM referral_earnings
         WHERE referrer_wallet = $1`,
        [wallet],
      );

      // Payouts
      const payouts = await pool.query(
        `SELECT COALESCE(SUM(amount_lamports), 0)::bigint AS total_paid
         FROM referral_payouts
         WHERE referrer_wallet = $1 AND status = 'completed'`,
        [wallet],
      );

      const totalEarned = BigInt(earnings.rows[0]?.total_earned ?? "0");
      const totalPaid = BigInt(payouts.rows[0]?.total_paid ?? "0");
      const pendingBalance = totalEarned - totalPaid;

      res.json({
        wallet,
        code: codeRow.code,
        referral_link: `https://bondit.lol?ref=${codeRow.code}`,
        total_referrals: refCounts.rows[0]?.total_referrals ?? 0,
        active_referees: earnings.rows[0]?.active_referees ?? 0,
        total_earned_lamports: totalEarned.toString(),
        earned_24h_lamports: earnings.rows[0]?.earned_24h?.toString() ?? "0",
        earned_7d_lamports: earnings.rows[0]?.earned_7d?.toString() ?? "0",
        total_paid_lamports: totalPaid.toString(),
        pending_balance_lamports: pendingBalance.toString(),
        total_trades_referred: earnings.rows[0]?.total_trades ?? 0,
      });
    } catch (err) {
      logger.error({ err }, "API: getReferralStats failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * POST /api/referral/record-trade — called by the indexer when a trade is detected.
   * Computes referral earnings for tier-1 and tier-2 referrers.
   * Split: 50% to direct referrer, 15% to 2nd-degree, 35% to platform airdrop pool.
   */
  private async recordTradeEarning(req: Request, res: Response): Promise<void> {
    try {
      const pool = getDatabasePool();
      if (!pool) { res.status(503).json({ error: "Database not configured" }); return; }

      const trader = req.body?.trader as string;
      const launchId = req.body?.launch_id as string;
      const tradeTx = req.body?.trade_tx as string;
      const feeLamports = BigInt(req.body?.fee_lamports ?? "0");
      const referralPoolLamports = BigInt(req.body?.referral_pool_lamports ?? "0");

      if (!trader || !launchId || !tradeTx || referralPoolLamports <= 0n) {
        res.status(400).json({ error: "Missing required fields" }); return;
      }

      // Anti-gaming: minimum fee threshold (1000 lamports ≈ dust filter)
      if (feeLamports < 1000n) {
        res.json({ status: "skipped", reason: "fee_too_small" }); return;
      }

      // Check for duplicate trade
      const dupCheck = await pool.query(
        `SELECT id FROM referral_earnings WHERE trade_tx = $1 LIMIT 1`, [tradeTx],
      );
      if (dupCheck.rows.length > 0) {
        res.json({ status: "already_recorded" }); return;
      }

      // Find tier-1 referrer (who referred this trader?)
      const attr = await pool.query(
        `SELECT referrer_wallet FROM referral_attributions WHERE referee_wallet = $1`, [trader],
      );

      if (attr.rows.length === 0) {
        // Trader has no referrer — entire referral pool goes to platform airdrop
        res.json({ status: "no_referrer", airdrop_pool: referralPoolLamports.toString() });
        return;
      }

      const tier1Referrer = attr.rows[0].referrer_wallet;
      // 50% of referral pool to direct referrer
      const tier1Earned = (referralPoolLamports * 50n) / 100n;

      await pool.query(
        `INSERT INTO referral_earnings (referrer_wallet, referee_wallet, launch_id, trade_tx, tier, fee_lamports, earned_lamports)
         VALUES ($1, $2, $3, $4, 1, $5, $6)`,
        [tier1Referrer, trader, launchId, tradeTx, feeLamports.toString(), tier1Earned.toString()],
      );

      // Find tier-2 referrer (who referred the referrer?)
      let tier2Earned = 0n;
      const parentAttr = await pool.query(
        `SELECT referrer_wallet FROM referral_attributions WHERE referee_wallet = $1`, [tier1Referrer],
      );

      if (parentAttr.rows.length > 0) {
        const tier2Referrer = parentAttr.rows[0].referrer_wallet;
        // 15% of referral pool to second-degree referrer
        tier2Earned = (referralPoolLamports * 15n) / 100n;

        await pool.query(
          `INSERT INTO referral_earnings (referrer_wallet, referee_wallet, launch_id, trade_tx, tier, fee_lamports, earned_lamports)
           VALUES ($1, $2, $3, $4, 2, $5, $6)`,
          [tier2Referrer, trader, launchId, tradeTx + ":t2", feeLamports.toString(), tier2Earned.toString()],
        );
      }

      // Remaining goes to platform airdrop pool (35% or 50% if no tier-2)
      const airdropPool = referralPoolLamports - tier1Earned - tier2Earned;

      res.json({
        status: "recorded",
        tier1_referrer: tier1Referrer,
        tier1_earned: tier1Earned.toString(),
        tier2_earned: tier2Earned.toString(),
        airdrop_pool: airdropPool.toString(),
      });
    } catch (err) {
      logger.error({ err }, "API: recordTradeEarning failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
