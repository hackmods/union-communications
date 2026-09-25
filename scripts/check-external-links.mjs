#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TIMEOUT = Number(process.env.UNION_AUDIT_EXTERNAL_TIMEOUT_MS || 15_000);

function extractUrls(file) {
  const text = fs.readFileSync(file, "utf8");
  return [...new Set([...text.matchAll(/https?:\/\/[^"'\s)]+/g)].map((m) =>
    m[0].replace(/[.,;]+$/, ""),
  ))];
}

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "UnionOps-external-link-check/1.0" },
    });
    if (res.status === 405 || res.status === 403 || res.status === 404) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "UnionOps-external-link-check/1.0" },
      });
    }
    return { url, status: res.status, ok: res.status >= 200 && res.status < 400 };
  } catch (err) {
    return { url, status: 0, ok: false, error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

const urls = extractUrls(path.join(ROOT, "src/lib/constants/comms-sources.ts"));
console.log(`Checking ${urls.length} external URLs...`);
const results = [];
for (const url of urls) {
  const result = await check(url);
  results.push(result);
  console.log(`${result.ok ? "OK" : "FAIL"} ${result.status || "ERR"} ${url}`);
}
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`\n${failed.length} external link(s) failed`);
  process.exitCode = 1;
} else {
  console.log("\nAll external links healthy");
}
