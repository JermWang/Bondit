#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init";
import { validateCommand } from "./commands/validate";
import { simulateCommand } from "./commands/simulate";
import { createCommand } from "./commands/create";
import { statusCommand } from "./commands/status";
import { log } from "./utils/logger";

// Show branded banner on every run
log.banner();

const program = new Command();

program
  .name("bondit")
  .description("BondIt.lol CLI — Launch tokens with Agency stewardship on Solana")
  .version("1.0.0");

// ── bondit launch ───────────────────────────────────────────────────────────

const launch = program.command("launch").description("Token launch commands");

launch
  .command("init")
  .description("Create a bondit-launch.json config interactively")
  .option("-y, --yes", "Use defaults (non-interactive, for scripting/agents)")
  .action(async (opts) => {
    await initCommand({ yes: opts.yes });
  });

launch
  .command("validate")
  .description("Validate bondit-launch.json against schema + business rules")
  .action(async () => {
    const ok = await validateCommand();
    if (!ok) process.exitCode = 1;
  });

launch
  .command("simulate")
  .description("Build and simulate the launch transaction without submitting")
  .action(async () => {
    const ok = await simulateCommand();
    if (!ok) process.exitCode = 1;
  });

launch
  .command("create")
  .description("Sign, submit, and confirm the launch transaction on-chain")
  .option("--skip-simulate", "Skip preflight simulation (not recommended)")
  .action(async (opts) => {
    await createCommand({ skipSimulate: opts.skipSimulate });
  });

launch
  .command("status <launchId>")
  .description("Fetch on-chain launch state (hex ID or base58 address)")
  .option("--rpc <url>", "Solana RPC URL override")
  .action(async (launchId: string, opts) => {
    await statusCommand(launchId, { rpc: opts.rpc });
  });

// ── Parse ───────────────────────────────────────────────────────────────────

program.parse(process.argv);
