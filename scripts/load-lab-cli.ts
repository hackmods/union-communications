#!/usr/bin/env npx tsx
/**
 * CLI entry for Load Lab scenarios (local/dev). Primary production path is
 * the on-box Lab UI at /load-test-lab/ with LOAD_LAB_ENABLED=true.
 *
 * Usage:
 *   LOAD_LAB_ENABLED=true npm run test:load:smoke
 *   LOAD_LAB_ENABLED=true TEST_ENV=production ALLOW_PRODUCTION_LOAD_TEST=true npm run test:load:capacity
 */
import {
  executeLoadRun,
  type LoadLabProfile,
} from "../src/lib/ops/load-lab";

const profile = (process.argv[2] ?? "smoke") as LoadLabProfile;
const allowed: LoadLabProfile[] = ["smoke", "public", "hub-read", "capacity"];
if (!allowed.includes(profile)) {
  console.error(`Unknown profile: ${profile}. Use: ${allowed.join(", ")}`);
  process.exit(1);
}

const envName = (process.env.TEST_ENV ?? "local") as
  | "local"
  | "staging"
  | "production";

if (envName === "production") {
  if (process.env.LOAD_LAB_ENABLED !== "true") {
    console.error("Production CLI runs require LOAD_LAB_ENABLED=true");
    process.exit(1);
  }
  if (process.env.ALLOW_PRODUCTION_LOAD_TEST !== "true") {
    console.error(
      "Production CLI runs require ALLOW_PRODUCTION_LOAD_TEST=true",
    );
    process.exit(1);
  }
}

const ac = new AbortController();
process.on("SIGINT", () => ac.abort());
process.on("SIGTERM", () => ac.abort());

const vus = process.env.LOAD_VUS
  ? Number(process.env.LOAD_VUS)
  : profile === "smoke"
    ? 2
    : 25;
const durationSec = process.env.LOAD_DURATION
  ? Number(process.env.LOAD_DURATION)
  : profile === "smoke"
    ? 15
    : 45;

async function main() {
  console.log(`Load Lab CLI — profile=${profile} env=${envName} vus=${vus}`);
  const summary = await executeLoadRun(
    {
      profile,
      envName,
      baseUrl: process.env.BASE_URL,
      vus,
      durationSec,
      rampSec: Number(process.env.LOAD_RAMP_DURATION ?? "5"),
      username: process.env.LOAD_TEST_USERNAME,
      password: process.env.LOAD_TEST_PASSWORD,
      allowProduction: process.env.ALLOW_PRODUCTION_LOAD_TEST === "true",
    },
    {
      signal: ac.signal,
      credentials:
        process.env.LOAD_TEST_USERNAME && process.env.LOAD_TEST_PASSWORD
          ? {
              username: process.env.LOAD_TEST_USERNAME,
              password: process.env.LOAD_TEST_PASSWORD,
            }
          : undefined,
      preferLoopback: !process.env.BASE_URL,
      onProgress: (p) => console.log(`  ${p.message}`),
    },
  );
  console.log(
    JSON.stringify(
      {
        runId: summary.runId,
        lastHealthyVus: summary.lastHealthyVus,
        firstDegradedVus: summary.firstDegradedVus,
        firstFailedVus: summary.firstFailedVus,
        sustainableReqPerSec: summary.sustainableReqPerSec,
        aborted: summary.aborted,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote load-results/${summary.runId}/summary.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
