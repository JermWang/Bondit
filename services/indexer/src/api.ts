import { Router, Request, Response, NextFunction } from "express";
import { Connection } from "@solana/web3.js";
import { logger } from "./logger";
import { IndexerReadModel } from "./read-model";
import { getSampleLaunchRecord, listSampleLaunches } from "./sample-data";

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

  private getRecord(launchId: string) {
    return getSampleLaunchRecord(launchId);
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
  }

  private async getLaunches(_req: Request, res: Response): Promise<void> {
    try {
      const live = await this.readModel.listLaunches();
      if (live && live.total > 0) {
        res.json(live);
        return;
      }

      const launches = listSampleLaunches();
      res.json({ launches, total: launches.length });
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

      const record = this.getRecord(launchId);
      if (!record) {
        this.respondNotFound(res, launchId, "launch");
        return;
      }

      res.json(record.launch);
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

      const record = this.getRecord(launchId);
      if (!record) {
        this.respondNotFound(res, launchId, "curve state");
        return;
      }

      res.json(record.curve);
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

      const record = this.getRecord(launchId);
      if (!record) {
        this.respondNotFound(res, launchId, "trades");
        return;
      }

      const trades = record.trades.slice(offset, offset + limit);
      res.json({ launchId, trades, total: record.trades.length, limit, offset });
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

      const record = this.getRecord(launchId);
      if (!record) {
        this.respondNotFound(res, launchId, "charter");
        return;
      }

      res.json(record.charter);
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

      const record = this.getRecord(launchId);
      if (!record) {
        this.respondNotFound(res, launchId, "treasury state");
        return;
      }

      res.json(record.treasury);
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

      const record = this.getRecord(launchId);
      if (!record) {
        this.respondNotFound(res, launchId, "policy actions");
        return;
      }

      const actions = record.policyActions.slice(0, limit);
      res.json({ launchId, actions, total: record.policyActions.length, limit });
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

      const record = this.getRecord(launchId);
      if (!record) {
        this.respondNotFound(res, launchId, "holder stats");
        return;
      }

      res.json(record.holders);
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

      const record = this.getRecord(launchId);
      if (!record) {
        this.respondNotFound(res, launchId, "liquidity stats");
        return;
      }

      res.json(record.liquidity);
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

      const record = this.getRecord(launchId);
      if (!record) {
        this.respondNotFound(res, launchId, "flight status");
        return;
      }

      res.json(record.flight);
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

      const record = this.getRecord(launchId);
      if (!record) {
        this.respondNotFound(res, launchId, "fee breakdown");
        return;
      }

      res.json(record.fees);
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

      const record = this.getRecord(launchId);
      if (!record) {
        this.respondNotFound(res, launchId, "dashboard");
        return;
      }

      res.json(record.dashboard);
    } catch (err) {
      logger.error({ err }, "API: getDashboard failed");
      res.status(500).json({ error: "Internal server error" });
    }
  }
}
