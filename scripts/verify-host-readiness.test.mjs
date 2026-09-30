import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { after, before, test } from "node:test";

const backendKeys = [
  "GRIEVANCE_DB_BACKEND", "BUMPING_DB_BACKEND", "AUDIT_DB_BACKEND", "TIME_DB_BACKEND",
  "ATTACHMENTS_DB_BACKEND", "DISCUSSIONS_DB_BACKEND", "TASKS_DB_BACKEND", "INFORMAL_LOG_DB_BACKEND",
  "SNIPPETS_DB_BACKEND", "MINUTES_DB_BACKEND", "LEDGER_DB_BACKEND", "OFFICERS_DB_BACKEND",
  "TRAVEL_DB_BACKEND", "EXPENSES_DB_BACKEND", "COMMITTEES_DB_BACKEND", "ELECTIONS_DB_BACKEND",
  "POLLS_DB_BACKEND", "MEETINGS_DB_BACKEND", "MEETINGS_RSVP_DB_BACKEND", "CHECKINS_DB_BACKEND",
  "AUTH_USERS_BACKEND", "FEEDBACK_DB_BACKEND", "OFFICER_LEARNING_DB_BACKEND", "PLATFORM_SETTINGS_DB_BACKEND",
  "BYLAWS_DB_BACKEND", "PROPOSALS_DB_BACKEND", "DATA_DB_BACKEND", "ACCESS_REQUEST_DB_BACKEND",
  "PORTAL_DB_BACKEND",
];

const body = {
  status: "ok",
  hostedCustomerMode: true,
  mfaEnabled: true,
  mfaMode: "totp",
  postgresConfigured: true,
  postgresFlipComplete: true,
  memoryCaseDataActive: false,
  demoAuthEnabled: false,
  databaseDeployment: { verified: true, mode: "postgres", tailTag: "test-tail" },
  tenantRegistry: { seeded: true, unionCount: 1 },
  backends: Object.fromEntries(backendKeys.map((key) => [key, key === "DATA_DB_BACKEND" ? "memory" : "postgres"])),
  hostedControlEvidence: {
    attachmentStorageApproved: true,
    strictUploadScan: true,
    backupRestoreEvidence: true,
    alertDeliveryEvidence: true,
    publicLegalContacts: true,
  },
};

let server;
let healthUrl;
/** @type {number} */
let responseStatus = 200;

before(async () => {
  server = createServer((_request, response) => {
    response.writeHead(responseStatus, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  healthUrl = `http://127.0.0.1:${server.address().port}/api/health`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function runGate() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/verify-host-readiness.mjs"], {
      timeout: 10_000,
      env: {
      ...process.env,
      HEALTH_URL: healthUrl,
      REQUIRE_HOSTED_CUSTOMER_MODE: "true",
      HOST_READINESS_SECRET: "test-readiness-secret-that-is-long-enough-0123456789",
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (status) => resolve({ status, stdout, stderr }));
  });
}

test("passes hosted readiness when public contacts are configured and current", async () => {
  responseStatus = 200;
  body.status = "ok";
  body.hostedControlEvidence.publicLegalContacts = true;
  const result = await runGate();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /PASS public legal identity and monitored role contacts are configured and current/);
});

test("accepts HTTP 503 when health JSON status is degraded", async () => {
  responseStatus = 503;
  body.status = "degraded";
  body.hostedControlEvidence.publicLegalContacts = true;
  const result = await runGate();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /PASS status reachable/);
  responseStatus = 200;
  body.status = "ok";
});

test("blocks hosted readiness when public contacts are missing or stale", async () => {
  responseStatus = 200;
  body.status = "ok";
  body.hostedControlEvidence.publicLegalContacts = false;
  const result = await runGate();
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /FAIL public legal identity and monitored role contacts are configured and current/);
});
