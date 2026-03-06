import * as fs from "fs";
import { log } from "../utils/logger";
import { readConfig, getDefaultKeypairPath } from "../utils/config";
import { isPhantomConfigured } from "../utils/phantom";

/**
 * `bondit launch validate`
 *
 * Validates the bondit-launch.json config against schema rules and business constraints.
 * Returns structured pass/fail results before any on-chain interaction.
 */
export async function validateCommand(): Promise<boolean> {
  log.heading(`${log.brand()} — Launch Validator`);
  log.divider();

  let config;
  try {
    config = readConfig();
  } catch (err) {
    log.error((err as Error).message);
    return false;
  }

  const checks: { label: string; ok: boolean; detail: string }[] = [];

  // Name length
  checks.push({
    label: "Token name",
    ok: config.name.length >= 1 && config.name.length <= 32,
    detail: `"${config.name}" (${config.name.length} chars, max 32)`,
  });

  // Symbol length
  checks.push({
    label: "Symbol",
    ok: config.symbol.length >= 1 && config.symbol.length <= 10,
    detail: `"${config.symbol}" (${config.symbol.length} chars, max 10)`,
  });

  // URI length + format
  const uriOk = config.uri.length >= 1 && config.uri.length <= 200;
  const uriFormat = config.uri.startsWith("http://") || config.uri.startsWith("https://") || config.uri.startsWith("ipfs://");
  checks.push({
    label: "Metadata URI",
    ok: uriOk && uriFormat,
    detail: uriOk
      ? uriFormat
        ? `Valid (${config.uri.length} chars)`
        : `Invalid scheme — expected http(s):// or ipfs://`
      : `Too long (${config.uri.length} chars, max 200)`,
  });

  // Launch mode
  const validModes = ["native", "pumproute"];
  checks.push({
    label: "Launch mode",
    ok: validModes.includes(config.mode),
    detail: config.mode,
  });

  // Wallet provider
  const walletProvider = config.walletProvider || "keypair";
  checks.push({
    label: "Wallet provider",
    ok: walletProvider === "phantom" || walletProvider === "keypair",
    detail: walletProvider === "phantom" ? "Phantom Server SDK" : "Raw Keypair",
  });

  if (walletProvider === "phantom") {
    // Phantom credentials
    const phantomOk = isPhantomConfigured();
    checks.push({
      label: "Phantom credentials",
      ok: phantomOk,
      detail: phantomOk
        ? "PHANTOM_ORG_ID, PHANTOM_APP_ID, PHANTOM_API_KEY set"
        : "MISSING — set PHANTOM_ORG_ID, PHANTOM_APP_ID, PHANTOM_API_KEY env vars",
    });
  } else {
    // Keypair exists
    const keypairPath = config.keypairPath || getDefaultKeypairPath();
    const keypairExists = fs.existsSync(keypairPath);
    checks.push({
      label: "Keypair file",
      ok: keypairExists,
      detail: keypairExists ? keypairPath : `NOT FOUND: ${keypairPath}`,
    });
  }

  // RPC URL format
  const rpcUrl = config.rpcUrl || "";
  const rpcOk = rpcUrl.startsWith("http://") || rpcUrl.startsWith("https://");
  checks.push({
    label: "RPC URL",
    ok: rpcOk,
    detail: rpcOk ? rpcUrl : `Invalid: "${rpcUrl}"`,
  });

  // Idempotency key
  checks.push({
    label: "Idempotency key",
    ok: !!config.idempotencyKey && config.idempotencyKey.length > 0,
    detail: config.idempotencyKey || "MISSING — run `bondit launch init` again",
  });

  // Print results
  let allPassed = true;
  for (const check of checks) {
    if (check.ok) {
      log.kvAccent(check.label, `✔ ${check.detail}`);
    } else {
      log.kvError(check.label, `✖ ${check.detail}`);
      allPassed = false;
    }
  }

  log.divider();

  if (allPassed) {
    log.success("All checks passed. Ready to simulate.");
    log.dim("Next: bondit launch simulate");
  } else {
    log.error("Validation failed. Fix the issues above and re-run.");
  }

  return allPassed;
}
