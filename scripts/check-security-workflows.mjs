import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ci = await readFile(".github/workflows/ci.yml", "utf8");
const scheduled = await readFile(".github/workflows/scheduled-dependency-audit.yml", "utf8");
const codeql = await readFile(".github/workflows/codeql.yml", "utf8");
const dast = await readFile(".github/workflows/dast-staging.yml", "utf8");
const dastHosts = JSON.parse(await readFile(".github/security/dast-staging-hosts.json", "utf8"));
const dependabot = await readFile(".github/dependabot.yml", "utf8");

const smokeStep = "      - name: Post-deploy /api/health smoke\n";
const readinessStep = "      - name: Post-deploy host readiness gate\n";
const auditStart = ci.indexOf("\n  security-audit:\n");
const secretStart = ci.indexOf("\n  secret-scan:\n");
const dockerStart = ci.indexOf("\n  docker-image:\n");
const dispatchScanStart = ci.indexOf("\n  dispatch-image-scan:\n");
assert(auditStart >= 0, "CI must include a standalone dependency audit job.");
assert(secretStart > auditStart, "CI must include a secret scan after the dependency audit.");
assert(dockerStart > secretStart, "Secret scanning must precede image publication.");
assert(dispatchScanStart > dockerStart, "CI must scan manually selected prebuilt images.");
const auditBlock = ci.slice(auditStart, dockerStart);
assert.match(auditBlock, /npm audit --json/);
assert.match(auditBlock, /node scripts\/check-npm-audit\.mjs/);
assert.match(auditBlock, /\.github\/security\/npm-audit-exceptions\.json/);
const secretBlock = ci.slice(secretStart, dockerStart);
assert.match(secretBlock, /fetch-depth:\s*0/, "Secret scanning must check repository history.");
assert.match(secretBlock, /ghcr\.io\/gitleaks\/gitleaks@sha256:[a-f0-9]{64}/, "Gitleaks must use a digest-pinned image.");
assert.match(secretBlock, /git --config \/repo\/\.gitleaks\.toml --redact --verbose --exit-code 1 --log-opts=--all/, "Gitleaks must use the repo allowlist, scan all refs, and redact secrets in output.");
const dockerBlock = ci.slice(dockerStart, ci.indexOf("\n  deploy:\n"));
assert.match(
  dockerBlock,
  /needs:\s*\[security-audit, secret-scan\]/,
  "Docker image publication must wait for dependency and secret security gates.",
);
assert.match(dockerBlock, /published_image_ref:\s*\$\{\{ steps\.verify-ghcr\.outputs\.image_ref \}\}/);
const imageScanIndex = dockerBlock.indexOf("Scan built image for critical and high vulnerabilities");
const registryLoginIndex = dockerBlock.indexOf("Log in to GHCR");
assert(imageScanIndex >= 0 && registryLoginIndex > imageScanIndex, "The built image must pass its scan before registry login/publication.");
assert.match(dockerBlock, /aquasecurity\/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25/);
assert.match(dockerBlock, /severity:\s*CRITICAL,HIGH/);
assert.match(dockerBlock, /exit-code:\s*["']?1["']?/);
assert.match(dockerBlock, /ignore-unfixed:\s*false/);
assert.match(dockerBlock, /name: Retain image scan report[\s\S]*?if:\s*always\(\)[\s\S]*?retention-days:\s*30/);
const productionScanIndex = dockerBlock.indexOf("Scan production-configured image for critical and high vulnerabilities");
const productionPushIndex = dockerBlock.indexOf("Push production hardened image");
assert(productionScanIndex >= 0 && productionPushIndex > productionScanIndex, "Production-configured image must be scanned before push.");
assert.match(dockerBlock, /-t ghcr\.io\/\$\{\{ github\.repository \}\}:production/);
const dispatchBlock = ci.slice(dispatchScanStart, ci.indexOf("\n  deploy:\n"));
assert.match(dispatchBlock, /if:\s*github\.event_name == 'workflow_dispatch'/);
assert.match(dispatchBlock, /outputs:\s*image_ref:\s*\$\{\{ steps\.digest\.outputs\.image_ref \}\}/);
assert.match(dispatchBlock, /Invalid GHCR image tag/);
assert.match(dispatchBlock, /docker pull "\$IMAGE"/);
assert.match(dispatchBlock, /docker image inspect --format='\{\{index \.RepoDigests 0\}\}'/);
assert.match(dispatchBlock, /image-ref:\s*\$\{\{ steps\.digest\.outputs\.image_ref \}\}/);
assert.match(dispatchBlock, /trivy-dispatch-image-report/);
const deployStart = ci.indexOf("\n  deploy:\n");
assert(deployStart >= 0, "CI must include a deploy job.");
const deployBlock = ci.slice(deployStart);
assert.match(
  deployBlock,
  /needs:\s*\[docker-image, dispatch-image-scan, test-gate, security-audit, secret-scan\]/,
  "Deploy must wait for the built or selected image scan, test-gate, dependency audit, and secret scan jobs.",
);
assert.match(
  deployBlock,
  /needs\.test-gate\.result == 'success'/,
  "Every deployment trigger must require a successful test-gate (quality + sharded E2E, or intentional docs-only skip).",
);
assert.match(ci, /\n  quality:\n/, "CI must include a quality job (lint/typecheck/unit).");
assert.match(ci, /\n  build-app:\n/, "CI must include a build-app job that produces the standalone artifact.");
assert.match(ci, /\n  e2e-smoke:\n/, "CI must include a sharded e2e-smoke job.");
assert.match(ci, /\n  test-gate:\n/, "CI must include a test-gate job for deploy.");
assert.match(ci, /--shard=\$\{\{\s*matrix\.shard\s*\}\}\/4/, "E2E smoke must shard across 4 runners.");
assert.match(ci, /\n  detect-changes:\n/, "CI must detect docs-only PRs before skipping the test belt.");
assert.match(
  ci,
  /needs\.detect-changes\.outputs\.run_full == 'true'/,
  "quality/build/E2E must gate on detect-changes.run_full so main never skips.",
);
assert.match(
  deployBlock,
  /needs\.security-audit\.result == 'success'/,
  "Every deployment trigger must require successful dependency audit.",
);
assert.match(
  deployBlock,
  /needs\.secret-scan\.result == 'success'/,
  "Every deployment trigger must require successful secret scanning.",
);
assert.match(
  deployBlock,
  /needs\.dispatch-image-scan\.result == 'success'/,
  "Manual dispatch must require a successful scan of its selected image.",
);
assert.match(
  deployBlock,
  /needs\.docker-image\.result == 'success'/,
  "Main-branch deployment must require a successful built-image scan.",
);
assert.match(deployBlock, /needs\.docker-image\.outputs\.published_image_ref/);
assert.match(deployBlock, /needs\.dispatch-image-scan\.outputs\.image_ref/);
assert.match(deployBlock, /ghcr\\\.io\/.+@sha256:\[a-f0-9\]\{64\}/);
const smokeIndex = ci.indexOf(smokeStep);
const readinessIndex = ci.indexOf(readinessStep);
assert(smokeIndex >= 0, "CI must include the post-deploy health smoke step.");
assert(readinessIndex > smokeIndex, "Host readiness must run after the health smoke.");

const nextStepIndex = ci.indexOf("\n      - name:", readinessIndex + readinessStep.length);
const readinessBlock = ci.slice(readinessIndex, nextStepIndex < 0 ? undefined : nextStepIndex);
assert(
  /steps\.deploy\.outputs\.DEPLOYED_IMAGE\s*!=\s*''/.test(readinessBlock),
  "Host readiness must cover a direct CI image deployment.",
);
assert(
  /steps\.deploy\.outputs\.EXTERNAL_DEPLOY_CONFIRMED\s*==\s*'1'/.test(readinessBlock),
  "Host readiness must cover an externally confirmed deployment.",
);
assert.match(readinessBlock, /REQUIRE_HOSTED_CUSTOMER_MODE:\s*"true"/);
assert.match(readinessBlock, /node scripts\/verify-host-readiness\.mjs/);

assert.match(scheduled, /cron:\s*"17 9 \* \* 1"/);
assert.match(scheduled, /npm audit --json/);
assert.match(scheduled, /node scripts\/check-npm-audit\.mjs/);
assert.match(scheduled, /\.github\/security\/npm-audit-exceptions\.json/);
assert.match(scheduled, /if:\s*always\(\)/);
assert.match(scheduled, /actions\/upload-artifact@v7/);
assert.match(scheduled, /retention-days:\s*30/);

assert.match(codeql, /pull_request:/);
assert.match(codeql, /push:/);
assert.match(codeql, /cron:\s*["']11 9 \* \* 1["']/);
assert.match(codeql, /github\/codeql-action\/init@v4\.38\.2/);
assert.match(codeql, /github\/codeql-action\/analyze@v4\.38\.2/);
assert.match(codeql, /languages:\s*javascript-typescript/);
assert.match(codeql, /queries:\s*security-extended/);
assert.match(codeql, /security-events:\s*write/);

assert.match(dast, /cron:\s*["']23 10 \* \* 1["']/);
assert.match(dast, /workflow_dispatch:/);
assert.match(dast, /DAST_STAGING_URL:\s*\$\{\{ vars\.DAST_STAGING_URL \}\}/);
assert.match(dast, /node scripts\/prepare-dast-target\.mjs/);
assert.match(dast, /if:\s*needs\.validate-target\.outputs\.scan_enabled == 'true'/);
assert.match(dast, /zaproxy\/action-baseline@v0\.15\.0/);
assert.match(dast, /allow_issue_writing:\s*false/);
assert.match(dast, /fail_action:\s*false/);
assert.match(dast, /artifact_name:\s*zap-staging-baseline-/);
assert(Array.isArray(dastHosts.approvedHosts), "DAST host allowlist must be a JSON array.");
assert(dastHosts.approvedHosts.every((host) => typeof host === "string"), "DAST approved hosts must be strings.");
assert(!dastHosts.approvedHosts.some((host) => ["unionops.org", "www.unionops.org"].includes(host.toLowerCase())), "Production hosts must never appear in the DAST allowlist.");

assert.equal((dependabot.match(/package-ecosystem:\s*npm/g) ?? []).length, 1);
assert.equal((dependabot.match(/package-ecosystem:\s*github-actions/g) ?? []).length, 1);
assert.equal((dependabot.match(/interval:\s*weekly/g) ?? []).length, 2);

console.log("Security workflow contract passed: image/deploy dependency and secret gates, pre-publish image scan, CodeQL and allowlisted DAST configuration, host readiness, scheduled audit report, and weekly npm/actions updates.");
