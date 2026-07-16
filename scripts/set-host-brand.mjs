/**
 * Write `config/host-brand.json` for a self-hosted UnionOps instance.
 *
 * Usage:
 *   npm run brand:set -- --primary=#CE1126 --secondary=#FFFFFF --accent=#9B0D1C
 *   npm run brand:set -- --primary=#003DA5 --local=243 --sub="Support Staff"
 *   npm run brand:set -- --from=config/host-brand.example.json
 *
 * Env vars NEXT_PUBLIC_BRAND_* override this file at runtime (see .env.example).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const targetPath = path.join(root, "config", "host-brand.json");

const HEX = /^#[0-9A-Fa-f]{6}$/;

function usage() {
  console.log(`Usage: npm run brand:set -- [options]

Options:
  --primary=<hex>     Primary brand colour (required unless --from)
  --secondary=<hex>   Graphics accent (default #FFFFFF)
  --accent=<hex>      Dark accent (default: darkened primary)
  --local=<number>    Default local number
  --sub=<text>        Default sub-text under local number
  --division=<id>     Optional division id
  --from=<path>       Copy from a JSON file (e.g. config/host-brand.example.json)
  --help              Show this help

Examples:
  npm run brand:set -- --primary=#CE1126 --secondary=#FFFFFF --local=79 --sub="Hospital Workers"
  npm run brand:set -- --from=config/host-brand.example.json
`);
}

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (!m) {
      throw new Error(`Unknown argument: ${arg}`);
    }
    out[m[1]] = m[2];
  }
  return out;
}

function darken(hex) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#C2410C";
  const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * 0.72));
  const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * 0.72));
  const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * 0.72));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
}

function assertHex(label, value) {
  if (!HEX.test(value)) {
    throw new Error(`${label} must be a 6-digit hex colour like #003DA5 (got ${value})`);
  }
  return value.toUpperCase();
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    usage();
    process.exit(1);
  }

  if (args.help || Object.keys(args).length === 0) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  let config;
  if (args.from) {
    const fromPath = path.resolve(root, args.from);
    config = JSON.parse(fs.readFileSync(fromPath, "utf8"));
  } else {
    if (!args.primary) {
      console.error("--primary is required (or use --from=…)");
      usage();
      process.exit(1);
    }
    const primary = assertHex("--primary", args.primary);
    const secondary = assertHex(
      "--secondary",
      args.secondary ?? "#FFFFFF",
    );
    const accent = assertHex(
      "--accent",
      args.accent ?? darken(primary),
    );
    config = {
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: accent,
      localNumber: args.local ?? "",
      subText: args.sub ?? "Support Staff",
    };
    if (args.division) config.divisionId = args.division;
  }

  assertHex("primaryColor", config.primaryColor);
  assertHex("secondaryColor", config.secondaryColor);
  assertHex("accentColor", config.accentColor);

  const out = {
    $schema: "./host-brand.schema.json",
    primaryColor: String(config.primaryColor).toUpperCase(),
    secondaryColor: String(config.secondaryColor).toUpperCase(),
    accentColor: String(config.accentColor).toUpperCase(),
    localNumber: String(config.localNumber ?? ""),
    subText: String(config.subText ?? "Support Staff"),
  };
  if (config.divisionId) out.divisionId = String(config.divisionId);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(root, targetPath)}`);
  console.log(JSON.stringify(out, null, 2));

  // Keep favicon suite aligned with the new host primary
  const faviconResult = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "generate-favicons.mjs")],
    { cwd: root, stdio: "inherit" },
  );
  if (faviconResult.status !== 0) {
    console.warn(
      "Warning: favicon regeneration failed; run npm run brand:favicons",
    );
  }

  console.log(
    "\nRebuild or restart `npm run dev` so the new defaults load. Existing browser Brand Kits are unchanged until reset.",
  );
}

main();
