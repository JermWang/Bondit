import chalk from "chalk";

const BRAND = chalk.hex("#A9FF00").bold("BondIt");
const DOT = chalk.hex("#A9FF00")(".");

// ── ASCII Art ───────────────────────────────────────────────────────────────

const BANNER_LINES = [
  "  ____                  _ ___ _     _       _ ",
  " | __ )  ___  _ __   __| |_ _| |_  | | ___ | |",
  " |  _ \\ / _ \\| '_ \\ / _` || || __| | |/ _ \\| |",
  " | |_) | (_) | | | | (_| || || |_ _| | (_) | |",
  " |____/ \\___/|_| |_|\\__,_|___|\\__(_)_|\\___/|_|",
];

const GRADIENT_STOPS = ["#A9FF00", "#88CC00", "#06B6D4", "#3B82F6", "#A9FF00"];

function gradientLine(line: string, idx: number, total: number): string {
  const t = idx / Math.max(total - 1, 1);
  const stopIdx = Math.min(Math.floor(t * (GRADIENT_STOPS.length - 1)), GRADIENT_STOPS.length - 2);
  const color = GRADIENT_STOPS[stopIdx];
  return chalk.hex(color)(line);
}

const TAGLINE_PARTS = [
  chalk.gray("  Agency-Stewarded Token Launches on "),
  chalk.hex("#A9FF00").bold("Solana"),
];

const ROCKET_FRAMES = [
  "        .\n       /|\\\n      / | \\\n     /  |  \\\n    /___|___\\\n    |       |\n    |  BON  |\n    |  DIT  |\n    |_______|\n     \\ . . /\n      \\. ./\n       \\./\n        *\n       ***\n      *****",
  "        .\n       /|\\\n      / | \\\n     /  |  \\\n    /___|___\\\n    |       |\n    |  BON  |\n    |  DIT  |\n    |_______|\n     \\ . . /\n      \\. ./\n       \\./\n       .**\n      .***\n     *****.",
];

export const log = {
  brand: () => `${BRAND}${DOT}lol`,

  banner: () => {
    console.log();
    BANNER_LINES.forEach((line, i) => {
      console.log(gradientLine(line, i, BANNER_LINES.length));
    });
    console.log(TAGLINE_PARTS.join(""));
    console.log(chalk.gray("  v1.0.0 ") + chalk.gray("·") + chalk.gray(" bondit.lol"));
    console.log();
  },

  rocket: () => {
    const lines = ROCKET_FRAMES[0].split("\n");
    for (const line of lines) {
      // Color the rocket body lime, flame orange/red
      if (line.includes("*")) {
        console.log(chalk.hex("#FF6B00")(line));
      } else if (line.includes("BON") || line.includes("DIT")) {
        console.log(chalk.hex("#A9FF00").bold(line));
      } else if (line.includes("/") || line.includes("\\") || line.includes("|") || line.includes("_")) {
        console.log(chalk.white(line));
      } else {
        console.log(chalk.gray(line));
      }
    }
    console.log();
  },

  launchSuccess: () => {
    console.log();
    console.log(chalk.hex("#A9FF00").bold("    ____  ____  _   _ ____  _____ ____  "));
    console.log(chalk.hex("#A9FF00")(      "   |    |    || \\ | |    ||     |    | "));
    console.log(chalk.hex("#88CC00")(      "   |    |____||  \\| |    ||  ---|__  | "));
    console.log(chalk.hex("#06B6D4")(      "   |___ |    ||     |    ||     |    | "));
    console.log(chalk.hex("#3B82F6")(      "   |____|____|_|\\__|____|_____|____| "));
    console.log();
    console.log(chalk.hex("#A9FF00")("   Token is live on the bonding curve!"));
    console.log();
  },

  info: (msg: string) => console.log(chalk.cyan("ℹ"), msg),
  success: (msg: string) => console.log(chalk.hex("#A9FF00")("✔"), msg),
  warn: (msg: string) => console.log(chalk.yellow("⚠"), msg),
  error: (msg: string) => console.error(chalk.red("✖"), msg),

  heading: (msg: string) => console.log(`\n${chalk.bold.white(msg)}`),
  dim: (msg: string) => console.log(chalk.gray(msg)),

  kv: (key: string, value: string) =>
    console.log(`  ${chalk.gray(key.padEnd(22))} ${chalk.white(value)}`),

  kvAccent: (key: string, value: string) =>
    console.log(`  ${chalk.gray(key.padEnd(22))} ${chalk.hex("#A9FF00")(value)}`),

  kvWarn: (key: string, value: string) =>
    console.log(`  ${chalk.gray(key.padEnd(22))} ${chalk.yellow(value)}`),

  kvError: (key: string, value: string) =>
    console.log(`  ${chalk.gray(key.padEnd(22))} ${chalk.red(value)}`),

  divider: () => console.log(chalk.gray("─".repeat(56))),

  explorer: (sig: string, cluster: string = "devnet") => {
    const url = `https://explorer.solana.com/tx/${sig}?cluster=${cluster}`;
    console.log(`  ${chalk.gray("Explorer")}              ${chalk.underline.cyan(url)}`);
  },

  explorerAccount: (address: string, cluster: string = "devnet") => {
    const url = `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
    console.log(`  ${chalk.gray("Explorer")}              ${chalk.underline.cyan(url)}`);
  },
};
