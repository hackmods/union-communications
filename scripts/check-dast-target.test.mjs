import assert from "node:assert/strict";
import { validateDastTarget } from "./prepare-dast-target.mjs";

const approved = ["staging.unionops.example"];

assert.deepEqual(validateDastTarget("", approved), {
  scan: false,
  reason: "DAST_STAGING_URL is not configured.",
});

assert.deepEqual(validateDastTarget("https://staging.unionops.example/", approved), {
  scan: true,
  targetUrl: "https://staging.unionops.example/",
});

for (const [name, url] of [
  ["production apex", "https://unionops.org/"],
  ["production www", "https://www.unionops.org/"],
  ["unapproved host", "https://other.unionops.example/"],
  ["plain HTTP", "http://staging.unionops.example/"],
  ["IP literal", "https://127.0.0.1/"],
  ["IPv6 loopback", "https://[::1]/"],
  ["localhost", "https://localhost/"],
  ["non-root path", "https://staging.unionops.example/app"],
  ["query string", "https://staging.unionops.example/?run=1"],
  ["fragment", "https://staging.unionops.example/#home"],
  ["embedded credentials", "https://operator:secret@staging.unionops.example/"],
  ["nonstandard port", "https://staging.unionops.example:8443/"],
]) {
  assert.throws(() => validateDastTarget(url, approved), undefined, name);
}

assert.throws(
  () => validateDastTarget("https://staging.unionops.example/", []),
  /not in \.github\/security\/dast-staging-hosts\.json/,
);

console.log("DAST target validation checks passed: skip state, approved origin, production/local denial, and malformed/unapproved targets.");
