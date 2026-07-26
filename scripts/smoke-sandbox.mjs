#!/usr/bin/env node
/**
 * Run @smoke Playwright suite against a remote host (default: Proxmox sandbox).
 * Skips local webServer when PLAYWRIGHT_BASE_URL is set.
 *
 * Avoid spawnSync + shell:true chaining on Windows — libuv can assert
 * UV_HANDLE_CLOSING after the health-check child exits.
 */
import { spawnSync } from "node:child_process";

const base =
  process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ||
  "http://192.168.0.115:3000";

const env = { ...process.env, PLAYWRIGHT_BASE_URL: base };

const health = spawnSync(process.execPath, ["scripts/health-check.mjs"], {
  stdio: "inherit",
  env,
});
if (health.status !== 0) {
  process.exit(health.status ?? 1);
}

const result = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", "--grep", "@smoke"],
  { stdio: "inherit", env },
);

process.exit(result.status ?? 1);
