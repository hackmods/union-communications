#!/usr/bin/env node
/**
 * Run @smoke Playwright suite against a remote host (default: Proxmox sandbox).
 * Skips local webServer when PLAYWRIGHT_BASE_URL is set.
 */
import { spawnSync } from "node:child_process";

const base =
  process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ||
  "http://192.168.0.115:3000";

const env = { ...process.env, PLAYWRIGHT_BASE_URL: base };

const health = spawnSync("node", ["scripts/health-check.mjs"], {
  stdio: "inherit",
  env,
  shell: true,
});
if (health.status !== 0) {
  process.exit(health.status ?? 1);
}

const result = spawnSync(
  "npx",
  ["playwright", "test", "--grep", "@smoke"],
  { stdio: "inherit", env, shell: true },
);

process.exit(result.status ?? 1);
