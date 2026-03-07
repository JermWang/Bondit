#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init";
import { validateCommand } from "./commands/validate";
import { simulateCommand } from "./commands/simulate";
import { createCommand } from "./commands/create";
import { statusCommand } from "./commands/status";
import { vanityCommand } from "./commands/vanity";
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
  .option("--no-vanity", "Skip vanity address grinding (not recommended)")
  .option("--vanity-suffix <chars>", "Custom Base58 suffix for vanity search", "LoL")
  .action(async (opts) => {
    await createCommand({
      skipSimulate: opts.skipSimulate,
      noVanity: opts.noVanity,
      vanitySuffix: opts.vanitySuffix,
    });
  });

launch
  .command("status <launchId>")
  .description("Fetch on-chain launch state (hex ID or base58 address)")
  .option("--rpc <url>", "Solana RPC URL override")
  .action(async (launchId: string, opts) => {
    await statusCommand(launchId, { rpc: opts.rpc });
  });

// ── bondit vanity ────────────────────────────────────────────────────────────

program
  .command("vanity")
  .description("Grind for a vanity token mint address (e.g. ending with LoL)")
  .option("-s, --suffix <chars>", "Base58 suffix to search for", "LoL")
  .option("-t, --target <type>", "PDA to match: mint or launch", "mint")
  .option("-w, --workers <n>", "Number of worker threads", parseInt)
  .option("--max-attempts <n>", "Maximum search attempts", parseInt)
  .option("--no-save", "Don't save the result to bondit-launch.json")
  .action(async (opts) => {
    await vanityCommand({
      suffix: opts.suffix,
      target: opts.target,
      workers: opts.workers,
      maxAttempts: opts.maxAttempts,
      save: opts.save,
    });
  });

// ── Parse ───────────────────────────────────────────────────────────────────

program.parse(process.argv);
