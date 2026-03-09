import { logger } from "./logger";
import { chainaware, bicscan, birdeye } from "./skills";

const INDEXER_API_BASE = process.env.INDEXER_API_URL ?? process.env.NEXT_PUBLIC_INDEXER_API_URL ?? "http://localhost:3001/api";

/**
 * AnomalyDetector — flags suspicious patterns using external intelligence skills.
 * 
 * Powered by:
 * - ChainAware: Fraud detection, rug-pull prediction, wallet behavior analysis
 * - BICScan: Address risk scoring (0-100)
 * - Birdeye: Token analytics for liquidity/volume anomalies
 * - Internal heuristics from indexer data
 * 
 * AI Authority: CAN flag, CANNOT take action.
 */
export class AnomalyDetector {
  async scan(launchId: string): Promise<AnomalyScanResult> {
    logger.info({ launchId }, "AnomalyDetector: starting scan");

    const results: AnomalyFlag[] = [];
    const skillsUsed: string[] = [];

    // Run all detection passes in parallel for speed
    const [washTrading, clustering, liquidityDrain, concentrationSpike, rugPull, creatorRisk] =
      await Promise.allSettled([
        this.detectWashTrading(launchId),
        this.detectClustering(launchId),
        this.detectLiquidityDrain(launchId),
        this.detectConcentrationSpike(launchId),
        this.detectRugPull(launchId),
        this.scoreCreatorRisk(launchId),
      ]);

    for (const r of [washTrading, clustering, liquidityDrain, concentrationSpike, rugPull, creatorRisk]) {
      if (r.status === "fulfilled") results.push(...r.value.flags);
      if (r.status === "fulfilled" && r.value.skill) skillsUsed.push(r.value.skill);
    }

    logger.info({
      launchId,
      flagCount: results.length,
      severities: results.map(r => r.severity),
      skillsUsed,
    }, "AnomalyDetector: scan complete");

    return {
      launchId,
      scannedAt: Date.now(),
      flags: results,
      skillsUsed,
      disclaimer: "ADVISORY ONLY — Anomaly detection is heuristic and may produce false positives. No automatic action is taken.",
    };
  }

  /**
   * Score a specific wallet address for risk.
   * Combines ChainAware fraud detection + BICScan risk scoring.
   */
  async scoreWallet(walletAddress: string): Promise<WalletRiskReport> {
    const [fraud, behaviour, risk] = await Promise.allSettled([
      chainaware.detectFraud(walletAddress),
      chainaware.analyzeBehaviour(walletAddress),
      bicscan.scoreAddress(walletAddress),
    ]);

    const fraudResult = fraud.status === "fulfilled" ? fraud.value : null;
    const behaviourResult = behaviour.status === "fulfilled" ? behaviour.value : null;
    const riskResult = risk.status === "fulfilled" ? risk.value : null;

    // Compute composite score (0-100)
    let compositeScore = 0;
    let sources = 0;

    if (fraudResult) {
      const fraudProb = parseFloat(fraudResult.probabilityFraud) * 100;
      compositeScore += fraudProb;
      sources++;
    }

    if (riskResult) {
      compositeScore += riskResult.riskScore;
      sources++;
    }

    if (sources > 0) compositeScore = Math.round(compositeScore / sources);

    const level: AnomalyFlag["severity"] =
      compositeScore >= 80 ? "critical" : compositeScore >= 60 ? "high" : compositeScore >= 30 ? "medium" : "low";

    return {
      walletAddress,
      compositeScore,
      level,
      chainaware: fraudResult ? {
        status: fraudResult.status,
        fraudProbability: fraudResult.probabilityFraud,
      } : null,
      behaviour: behaviourResult ? {
        intention: behaviourResult.intention?.Value ?? null,
        categories: behaviourResult.categories ?? [],
        recommendation: behaviourResult.recommendation?.Value ?? [],
      } : null,
      bicscan: riskResult ? {
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel,
        categories: riskResult.categories,
      } : null,
      scannedAt: Date.now(),
    };
  }

  // ── Detection passes ────────────────────────────────────────────────────

  private async detectWashTrading(launchId: string): Promise<DetectionResult> {
    const flags: AnomalyFlag[] = [];

    // Fetch recent trades from indexer
    try {
      const resp = await fetch(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}/trades?limit=200`, {
        signal: AbortSignal.timeout(8_000),
      });

      if (resp.ok) {
        const trades = (await resp.json()) as Array<{ wallet: string; side: string; slot: number; amount: string }>;

        // Heuristic: Find wallets that buy AND sell within 10 slots
        const walletTrades = new Map<string, Array<{ side: string; slot: number }>>();
        for (const t of trades) {
          if (!walletTrades.has(t.wallet)) walletTrades.set(t.wallet, []);
          walletTrades.get(t.wallet)!.push({ side: t.side, slot: t.slot });
        }

        for (const [wallet, wTrades] of walletTrades) {
          const buys = wTrades.filter((t) => t.side === "buy");
          const sells = wTrades.filter((t) => t.side === "sell");

          for (const buy of buys) {
            const quickSell = sells.find((s) => Math.abs(s.slot - buy.slot) < 10);
            if (quickSell) {
              flags.push({
                type: "wash_trading",
                severity: "medium",
                description: `Wallet ${wallet.slice(0, 8)}... bought and sold within ${Math.abs(quickSell.slot - buy.slot)} slots`,
                evidence: { wallets: [wallet], metrics: { slotDelta: String(Math.abs(quickSell.slot - buy.slot)) } },
                detectedAt: Date.now(),
              });
              break; // one flag per wallet
            }
          }
        }
      }
    } catch (err) {
      logger.debug({ err, launchId }, "AnomalyDetector: wash trading indexer fetch failed");
    }

    return { flags, skill: flags.length > 0 ? "indexer-heuristic" : undefined };
  }

  private async detectClustering(launchId: string): Promise<DetectionResult> {
    const flags: AnomalyFlag[] = [];

    try {
      const resp = await fetch(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}/trades?limit=200`, {
        signal: AbortSignal.timeout(8_000),
      });

      if (resp.ok) {
        const trades = (await resp.json()) as Array<{ wallet: string; side: string; slot: number }>;

        // Heuristic: Find 3+ wallets that all buy in the same slot
        const slotBuyers = new Map<number, Set<string>>();
        for (const t of trades) {
          if (t.side !== "buy") continue;
          if (!slotBuyers.has(t.slot)) slotBuyers.set(t.slot, new Set());
          slotBuyers.get(t.slot)!.add(t.wallet);
        }

        for (const [slot, wallets] of slotBuyers) {
          if (wallets.size >= 3) {
            flags.push({
              type: "clustering",
              severity: wallets.size >= 5 ? "high" : "medium",
              description: `${wallets.size} wallets bought in the same slot (${slot}) — possible coordinated buy`,
              evidence: { wallets: Array.from(wallets).slice(0, 10), metrics: { slot: String(slot), count: String(wallets.size) } },
              detectedAt: Date.now(),
            });
          }
        }
      }
    } catch (err) {
      logger.debug({ err, launchId }, "AnomalyDetector: clustering indexer fetch failed");
    }

    return { flags, skill: flags.length > 0 ? "indexer-heuristic" : undefined };
  }

  private async detectLiquidityDrain(launchId: string): Promise<DetectionResult> {
    const flags: AnomalyFlag[] = [];

    // Use Birdeye to check token liquidity if we have a mint address
    try {
      const dashResp = await fetch(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}/dashboard`, {
        signal: AbortSignal.timeout(8_000),
      });

      if (dashResp.ok) {
        const dash = (await dashResp.json()) as { mintAddress?: string; stewardship?: { lpDepthUsd?: string } };
        const mintAddress = dash.mintAddress;

        if (mintAddress && birdeye.isConfigured()) {
          const overview = await birdeye.getTokenOverview(mintAddress);
          if (overview) {
            // Flag if liquidity is very low relative to market cap
            if (overview.liquidity > 0 && overview.marketCap > 0) {
              const liquidityRatio = overview.liquidity / overview.marketCap;
              if (liquidityRatio < 0.02) {
                flags.push({
                  type: "liquidity_drain",
                  severity: liquidityRatio < 0.005 ? "critical" : "high",
                  description: `Liquidity-to-market-cap ratio is ${(liquidityRatio * 100).toFixed(2)}% — abnormally low. Potential liquidity drain.`,
                  evidence: {
                    metrics: {
                      liquidity: `$${overview.liquidity.toLocaleString()}`,
                      marketCap: `$${overview.marketCap.toLocaleString()}`,
                      ratio: `${(liquidityRatio * 100).toFixed(2)}%`,
                    },
                  },
                  detectedAt: Date.now(),
                });
              }
            }
          }
        }
      }
    } catch (err) {
      logger.debug({ err, launchId }, "AnomalyDetector: liquidity drain check failed");
    }

    return { flags, skill: flags.length > 0 ? "birdeye" : undefined };
  }

  private async detectConcentrationSpike(launchId: string): Promise<DetectionResult> {
    const flags: AnomalyFlag[] = [];

    try {
      const resp = await fetch(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}/dashboard`, {
        signal: AbortSignal.timeout(8_000),
      });

      if (resp.ok) {
        const dash = (await resp.json()) as { stewardship?: { top10ConcentrationBps?: number; holdersCount?: number } };
        const bps = dash.stewardship?.top10ConcentrationBps;
        const holders = dash.stewardship?.holdersCount ?? 0;

        // Flag if top-10 hold more than 60% and there are enough holders
        if (typeof bps === "number" && bps > 6000 && holders >= 50) {
          flags.push({
            type: "concentration_spike",
            severity: bps > 8000 ? "critical" : bps > 7000 ? "high" : "medium",
            description: `Top-10 holders control ${(bps / 100).toFixed(1)}% of supply with ${holders} total holders — high concentration risk`,
            evidence: {
              metrics: {
                top10Pct: `${(bps / 100).toFixed(1)}%`,
                holders: String(holders),
              },
            },
            detectedAt: Date.now(),
          });
        }
      }
    } catch (err) {
      logger.debug({ err, launchId }, "AnomalyDetector: concentration check failed");
    }

    return { flags, skill: flags.length > 0 ? "indexer-heuristic" : undefined };
  }

  private async detectRugPull(launchId: string): Promise<DetectionResult> {
    const flags: AnomalyFlag[] = [];

    try {
      const resp = await fetch(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}/dashboard`, {
        signal: AbortSignal.timeout(8_000),
      });

      if (resp.ok) {
        const dash = (await resp.json()) as { mintAddress?: string };
        if (dash.mintAddress) {
          const rugPull = await chainaware.detectRugPull(dash.mintAddress);
          if (rugPull && rugPull.riskScore > 50) {
            flags.push({
              type: "wash_trading", // closest existing type for rug-pull
              severity: rugPull.riskScore > 80 ? "critical" : rugPull.riskScore > 60 ? "high" : "medium",
              description: `ChainAware rug-pull risk score: ${rugPull.riskScore}/100 — ${rugPull.rugPullRisk}`,
              evidence: { metrics: { riskScore: String(rugPull.riskScore), source: "chainaware" } },
              detectedAt: Date.now(),
            });
          }
        }
      }
    } catch (err) {
      logger.debug({ err, launchId }, "AnomalyDetector: rug-pull check failed");
    }

    return { flags, skill: flags.length > 0 ? "chainaware" : undefined };
  }

  private async scoreCreatorRisk(launchId: string): Promise<DetectionResult> {
    const flags: AnomalyFlag[] = [];

    try {
      const resp = await fetch(`${INDEXER_API_BASE}/launches/${encodeURIComponent(launchId)}`, {
        signal: AbortSignal.timeout(8_000),
      });

      if (resp.ok) {
        const launch = (await resp.json()) as { creator?: string };
        if (launch.creator) {
          // BICScan risk score for the launch creator
          const risk = await bicscan.scoreAddress(launch.creator);
          if (risk && risk.riskScore >= 50) {
            flags.push({
              type: "clustering", // reuse for creator risk
              severity: risk.riskScore >= 80 ? "critical" : risk.riskScore >= 60 ? "high" : "medium",
              description: `Launch creator ${launch.creator.slice(0, 8)}... has BICScan risk score ${risk.riskScore}/100 (${risk.riskLevel})`,
              evidence: {
                wallets: [launch.creator],
                metrics: { riskScore: String(risk.riskScore), riskLevel: risk.riskLevel, source: "bicscan" },
              },
              detectedAt: Date.now(),
            });
          }

          // ChainAware fraud check on creator
          const fraud = await chainaware.detectFraud(launch.creator);
          if (fraud && fraud.status === "Fraud") {
            flags.push({
              type: "clustering",
              severity: "critical",
              description: `Launch creator ${launch.creator.slice(0, 8)}... flagged as FRAUD by ChainAware (probability: ${fraud.probabilityFraud})`,
              evidence: {
                wallets: [launch.creator],
                metrics: { fraudProbability: fraud.probabilityFraud, source: "chainaware" },
              },
              detectedAt: Date.now(),
            });
          }
        }
      }
    } catch (err) {
      logger.debug({ err, launchId }, "AnomalyDetector: creator risk check failed");
    }

    return { flags, skill: flags.length > 0 ? "chainaware+bicscan" : undefined };
  }
}

// ── Internal types ──────────────────────────────────────────────────────────

interface DetectionResult {
  flags: AnomalyFlag[];
  skill?: string;
}

export interface AnomalyFlag {
  type: "wash_trading" | "clustering" | "liquidity_drain" | "concentration_spike";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: {
    wallets?: string[];
    transactions?: string[];
    metrics?: Record<string, string>;
  };
  detectedAt: number;
}

export interface AnomalyScanResult {
  launchId: string;
  scannedAt: number;
  flags: AnomalyFlag[];
  skillsUsed: string[];
  disclaimer: string;
}

export interface WalletRiskReport {
  walletAddress: string;
  compositeScore: number;
  level: "low" | "medium" | "high" | "critical";
  chainaware: {
    status: string;
    fraudProbability: string;
  } | null;
  behaviour: {
    intention: Record<string, string> | null;
    categories: Array<{ Category: string; Count: number }>;
    recommendation: string[];
  } | null;
  bicscan: {
    riskScore: number;
    riskLevel: string;
    categories: string[];
  } | null;
  scannedAt: number;
}
