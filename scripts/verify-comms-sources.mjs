#!/usr/bin/env node
/**
 * Optional steward/CI helper: GET each URL in comms-sources.ts and print status.
 * opseu.org often returns 403 to scripts — treat browser verification as authoritative.
 *
 * Usage: node scripts/verify-comms-sources.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(
  join(root, "src/lib/constants/comms-sources.ts"),
  "utf8",
);

const urls = [...src.matchAll(/url:\s*"(https:\/\/[^"]+)"/g)].map((m) => m[1]);
const unique = [...new Set(urls)];

const ua =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let ok = 0;
let warn = 0;
let fail = 0;

for (const url of unique) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": ua },
    });
    const final = res.url;
    const host = new URL(final).hostname;
    const bucket =
      res.status === 404 || res.status === 410
        ? "FAIL"
        : res.status >= 400
          ? "WARN"
          : "OK";
    if (bucket === "OK") ok++;
    else if (bucket === "WARN") warn++;
    else fail++;
    console.log(
      JSON.stringify({ bucket, status: res.status, url, final: final !== url ? final : undefined }),
    );
  } catch (err) {
    fail++;
    console.log(JSON.stringify({ bucket: "FAIL", url, error: String(err) }));
  }
  await new Promise((r) => setTimeout(r, 300));
}

console.error(`\nSummary: ${ok} OK, ${warn} WARN (likely opseu bot wall), ${fail} FAIL`);
process.exitCode = fail > 0 ? 1 : 0;
