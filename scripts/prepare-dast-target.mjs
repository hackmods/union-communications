import { readFile, appendFile } from "node:fs/promises";
import { isIP } from "node:net";
import { pathToFileURL } from "node:url";

const allowlistPath = ".github/security/dast-staging-hosts.json";

export function validateDastTarget(rawTarget, approvedHosts) {
  if (typeof rawTarget !== "string" || rawTarget.trim() === "") {
    return { scan: false, reason: "DAST_STAGING_URL is not configured." };
  }

  let target;
  try {
    target = new URL(rawTarget.trim());
  } catch {
    throw new Error("DAST_STAGING_URL must be a valid absolute HTTPS URL.");
  }

  const hostname = target.hostname.toLowerCase().replace(/\.$/, "");
  const ipCandidate = hostname.replace(/^\[|\]$/g, "");
  if (target.protocol !== "https:") {
    throw new Error("DAST staging target must use HTTPS.");
  }
  if (target.username || target.password) {
    throw new Error("DAST staging URL must not contain credentials.");
  }
  if (target.port && target.port !== "443") {
    throw new Error("DAST staging target must use the standard HTTPS port.");
  }
  if (target.pathname !== "/" || target.search || target.hash) {
    throw new Error("DAST staging URL must be the origin root without query or fragment.");
  }
  if (
    isIP(ipCandidate) ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "unionops.org" ||
    hostname === "www.unionops.org"
  ) {
    throw new Error("The DAST target must be an approved staging hostname, not a production or local address.");
  }
  if (!Array.isArray(approvedHosts) || approvedHosts.some((host) => typeof host !== "string")) {
    throw new Error(`${allowlistPath} must contain an approvedHosts string array.`);
  }

  const approved = new Set(approvedHosts.map((host) => host.toLowerCase().replace(/\.$/, "")));
  if (!approved.has(hostname)) {
    throw new Error(`DAST hostname "${hostname}" is not in ${allowlistPath}.`);
  }

  return { scan: true, targetUrl: `https://${hostname}/` };
}

async function writeGitHubOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) await appendFile(outputFile, `${name}=${value}\n`, "utf8");
}

async function writeSummary(message) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) await appendFile(summaryFile, `## Staging DAST\n\n${message}\n`, "utf8");
}

async function main() {
  const configuration = JSON.parse(await readFile(allowlistPath, "utf8"));
  const decision = validateDastTarget(process.env.DAST_STAGING_URL, configuration.approvedHosts);
  await writeGitHubOutput("scan_enabled", String(decision.scan));

  if (!decision.scan) {
    const message = `**No scan ran.** ${decision.reason} Configure the staging URL and an exact approved hostname; this run is not evidence of a DAST scan.`;
    console.warn(message);
    await writeSummary(message);
    return;
  }

  await writeGitHubOutput("target_url", decision.targetUrl);
  console.log(`Approved DAST staging origin: ${decision.targetUrl}`);
  await writeSummary(`Approved target: \`${decision.targetUrl}\`. This is a passive unauthenticated baseline scan.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async (error) => {
    console.error(error instanceof Error ? error.message : "DAST target validation failed.");
    await writeSummary(`**Target validation failed; no scan ran.** ${error instanceof Error ? error.message : "Unknown validation error."}`);
    process.exitCode = 1;
  });
}
