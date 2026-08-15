#!/usr/bin/env node
/**
 * COPY-005 — EN readability ranking report (Flesch–Kincaid Grade Level).
 *
 * Report-only: always exits 0 on success. Prints the hardest public and Hub
 * leaves (strings with more than 8 words). Not a CI gate and not a school-grade
 * SLA — ranking signal only.
 *
 * Usage (repo root): npm run copy:readability
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatReadabilityReport,
  rankPublicAndHub,
} from "../src/lib/comms/readability";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const en = JSON.parse(
  readFileSync(join(root, "messages", "en.json"), "utf8"),
) as Record<string, unknown>;

const { public: pub, hub } = rankPublicAndHub(en, 20);

console.log("COPY-005 EN readability report (Flesch–Kincaid Grade Level)");
console.log(
  "Ranking signal only — higher grade = denser. No CI fail. EN public + Hub.",
);
console.log("");
console.log("=== Public (worst 20, >8 words) ===");
console.log(formatReadabilityReport(pub) || "(none)");
console.log("");
console.log("=== Officer Hub (worst 20, >8 words; informational) ===");
console.log(formatReadabilityReport(hub) || "(none)");
console.log("");
console.log(`Scored ${pub.length} public + ${hub.length} Hub rows shown.`);
