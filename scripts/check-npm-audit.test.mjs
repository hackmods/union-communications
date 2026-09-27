import assert from "node:assert/strict";
import { evaluateAudit } from "./check-npm-audit.mjs";

const now = new Date("2026-09-27T12:00:00.000Z");
const advisory = { source: 1234, name: "example", url: "https://example.test" };
let passed = 0;
function test(name, run) {
  run();
  passed += 1;
  console.log(`PASS ${name}`);
}

test("clean and low/moderate findings pass", () => {
  assert.equal(evaluateAudit({ vulnerabilities: {} }, {}, now).ok, true);
  assert.equal(evaluateAudit({
    vulnerabilities: {
      a: { severity: "low", via: [] },
      b: { severity: "moderate", via: [] },
    },
  }, {}, now).ok, true);
});

test("high findings require a named, justified, unexpired exact exception", () => {
  const audit = { vulnerabilities: { example: { severity: "high", via: [advisory] } } };
  assert.equal(evaluateAudit(audit, {}, now).ok, false);
  assert.equal(evaluateAudit(audit, {
    "example|1234": {
      approvedBy: "Security owner",
      expires: "2026-10-27",
      justification: "No fix is available; exposure is mitigated.",
    },
  }, now).ok, true);
  assert.equal(evaluateAudit(audit, {
    "example|1234": {
      approvedBy: "Security owner",
      expires: "2026-09-26",
      justification: "Temporary exception.",
    },
  }, now).ok, false);
});

test("high findings inherited through npm audit via chains resolve advisory IDs", () => {
  const audit = { vulnerabilities: {
    wrapper: { severity: "high", via: ["example"] },
    example: { severity: "high", via: [advisory] },
  } };
  const result = evaluateAudit(audit, {
    "wrapper|1234": {
      approvedBy: "Security owner",
      expires: "2026-10-27",
      justification: "Temporary mitigation is in place.",
    },
    "example|1234": {
      approvedBy: "Security owner",
      expires: "2026-10-27",
      justification: "Temporary mitigation is in place.",
    },
  }, now);
  assert.equal(result.ok, true, result.errors.join("; "));
});

test("critical, malformed audit and audit service errors fail closed", () => {
  assert.equal(evaluateAudit({ vulnerabilities: { a: { severity: "critical" } } }, {}, now).ok, false);
  assert.equal(evaluateAudit({ error: { code: "ENOAUDIT" } }, {}, now).ok, false);
  assert.equal(evaluateAudit({}, {}, now).ok, false);
  assert.equal(evaluateAudit({ vulnerabilities: {} }, {}, now, 2).ok, false);
});

console.log(`${passed} dependency audit policy checks passed.`);
