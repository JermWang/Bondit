import { logger } from "../logger";
import * as chainaware from "./chainaware";
import * as birdeye from "./birdeye";
import * as bicscan from "./bicscan";
import * as pyth from "./pyth";
import * as dune from "./dune";
import * as xresearch from "./xresearch";

// ── Skills Registry ─────────────────────────────────────────────────────────
// Central hub for all external intelligence skills.
// Each skill degrades gracefully — returns null when unconfigured.

export interface SkillStatus {
  name: string;
  configured: boolean;
  description: string;
}

export function getSkillStatuses(): SkillStatus[] {
  return [
    { name: "chainaware", configured: !!process.env.CHAINAWARE_API_KEY, description: "Fraud detection & rug-pull prediction" },
    { name: "birdeye", configured: birdeye.isConfigured(), description: "Solana token analytics & prices" },
    { name: "bicscan", configured: bicscan.isConfigured(), description: "Address risk scoring (0-100)" },
    { name: "pyth", configured: pyth.isConfigured(), description: "Real-time price feeds (free)" },
    { name: "dune", configured: dune.isConfigured(), description: "On-chain data queries" },
    { name: "xresearch", configured: xresearch.isConfigured(), description: "Twitter/X sentiment monitoring" },
  ];
}

export function logSkillStatuses(): void {
  const statuses = getSkillStatuses();
  const active = statuses.filter((s) => s.configured);
  const inactive = statuses.filter((s) => !s.configured);

  logger.info(
    { activeCount: active.length, totalCount: statuses.length },
    `Skills: ${active.length}/${statuses.length} active`,
  );

  for (const s of active) {
    logger.info({ skill: s.name }, `  ✔ ${s.name}: ${s.description}`);
  }
  for (const s of inactive) {
    logger.debug({ skill: s.name }, `  ○ ${s.name}: not configured`);
  }
}

export { chainaware, birdeye, bicscan, pyth, dune, xresearch };
