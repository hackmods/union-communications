import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SEVERITIES = ["critical", "high", "moderate", "low", "info"];

function findingAdvisories(packageName, findings, seen = new Set()) {
  if (seen.has(packageName)) return [];
  seen.add(packageName);
  const vulnerability = findings[packageName];
  if (!vulnerability) return [];
  return [...new Set((vulnerability.via ?? []).flatMap((entry) => {
    if (typeof entry === "string") {
      return findingAdvisories(entry, findings, seen);
    }
    if (entry && typeof entry === "object") {
      const source = String(entry.source ?? entry.name ?? "").trim();
      return source ? [source] : [];
    }
    return [];
  }))];
}

function exceptionKey(packageName, advisory) {
  return `${packageName}|${advisory}`;
}

/** Evaluate npm audit v2 JSON against narrowly scoped, expiring high exceptions. */
export function evaluateAudit(audit, exceptions, now = new Date(), auditExitStatus = 0) {
  const errors = [];
  const findings = audit?.vulnerabilities;
  if (!findings || typeof findings !== "object" || Array.isArray(findings)) {
    return { ok: false, errors: ["Audit JSON has no vulnerabilities object."], summary: [] };
  }
  if (audit.error) {
    return {
      ok: false,
      errors: [`npm audit failed: ${audit.error.summary ?? audit.error.code ?? "unknown error"}`],
      summary: [],
    };
  }
  if (!exceptions || typeof exceptions !== "object" || Array.isArray(exceptions)) {
    return { ok: false, errors: ["Exception registry must be a JSON object."], summary: [] };
  }

  const summary = [];
  if (!Number.isInteger(auditExitStatus) || auditExitStatus < 0 || auditExitStatus > 1) {
    errors.push(`npm audit command failed unexpectedly with status ${auditExitStatus}.`);
  }
  for (const [packageName, vulnerability] of Object.entries(findings)) {
    const severity = String(vulnerability?.severity ?? "").toLowerCase();
    if (!SEVERITIES.includes(severity)) {
      errors.push(`${packageName}: unknown audit severity ${JSON.stringify(severity)}.`);
      continue;
    }
    summary.push({ packageName, severity });
    if (severity === "critical") {
      errors.push(`${packageName}: critical vulnerability always blocks.`);
      continue;
    }
    if (severity !== "high") continue;

    const advisories = findingAdvisories(packageName, findings);
    if (advisories.length === 0) {
      errors.push(`${packageName}: high finding has no stable advisory ID for review.`);
      continue;
    }
    for (const advisory of advisories) {
      const key = exceptionKey(packageName, advisory);
      const exception = exceptions[key];
      if (!exception) {
        errors.push(`${packageName}: high finding ${advisory} has no approved exception.`);
        continue;
      }
      if (!exception.approvedBy?.trim() || !exception.justification?.trim()) {
        errors.push(`${key}: exception requires approvedBy and justification.`);
      }
      const expiry = exception.expires ?? "";
      const parsedExpiry = Date.parse(`${expiry}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) ||
          Number.isNaN(parsedExpiry) ||
          new Date(parsedExpiry).toISOString().slice(0, 10) !== expiry) {
        errors.push(`${key}: exception requires an expires date in YYYY-MM-DD format.`);
      } else if (Date.parse(`${exception.expires}T23:59:59.999Z`) < now.getTime()) {
        errors.push(`${key}: exception expired on ${exception.expires}.`);
      }
    }
  }

  return { ok: errors.length === 0, errors, summary };
}

async function main() {
  const [auditPath, exceptionPath, auditExitStatus = "0"] = process.argv.slice(2);
  if (!auditPath || !exceptionPath) {
    console.error("Usage: node scripts/check-npm-audit.mjs <audit.json> <exceptions.json>");
    process.exitCode = 2;
    return;
  }

  let audit;
  let exceptions;
  try {
    [audit, exceptions] = await Promise.all([
      readFile(auditPath, "utf8").then(JSON.parse),
      readFile(exceptionPath, "utf8").then(JSON.parse),
    ]);
  } catch (error) {
    console.error(`Could not read valid audit/exception JSON: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  const status = /^\d+$/.test(auditExitStatus) ? Number(auditExitStatus) : Number.NaN;
  const checked = evaluateAudit(audit, exceptions, new Date(), status);
  const totals = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0]));
  for (const finding of checked.summary) totals[finding.severity] += 1;
  console.log(`npm audit findings: ${JSON.stringify(totals)}`);
  if (!checked.ok) {
    for (const error of checked.errors) console.error(`BLOCK: ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Dependency audit policy passed.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
