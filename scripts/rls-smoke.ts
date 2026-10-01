/**
 * Live RLS smoke (SEC-003) against the non-owner application role.
 *
 * Requires migrations through the current tail, seeded Local 777 demo membership,
 * DATABASE_URL=postgres://unionops_app:... (not the table owner), and an independent
 * MIGRATE_DATABASE_URL owner connection for direct MFA persistence assertions.
 * Run: npm run db:rls-smoke
 */
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { APP_DB_ROLE } from "../src/lib/db/rls-contract";
import { resetDbClient } from "../src/lib/db/client";
import { reserveMfaVerificationAttempt } from "../src/lib/auth/mfa-attempt-limits";
import {
  getPendingSecret,
  setPendingSecret,
  clearPendingSecret,
} from "../src/lib/auth/mfa-enrollment-store";
import { consumeMfaGrant, getMfaGrant, issueMfaGrant } from "../src/lib/auth/mfa-grants";
import { isEncryptedTotpSecret } from "../src/lib/auth/totp-secret-crypto";
import { rotateMfaRecoveryCodes } from "../src/lib/auth/mfa-recovery-codes";

type MfaWorkerRequest =
  | { action: "read-pending"; userId: string; expectedSecret: string }
  | { action: "consume-grant"; userId: string; nonce: string };

function runMfaWorker(request: MfaWorkerRequest): string {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/register-server-only.mjs",
      "--import",
      "tsx",
      "scripts/mfa-durable-worker.ts",
    ],
    {
      env: process.env,
      input: JSON.stringify(request),
      encoding: "utf8",
      timeout: 30_000,
      windowsHide: true,
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `MFA second-process smoke failed: ${result.stderr || result.error?.message || "worker exited unexpectedly"}`,
    );
  }
  return result.stdout.trim();
}

async function expectMfaPermissionFailure(
  operation: () => Promise<unknown>,
  label: string,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    let current: unknown = error;
    for (let depth = 0; depth < 4; depth += 1) {
      if (!current || typeof current !== "object") break;
      const record = current as { code?: unknown; cause?: unknown };
      if (record.code === "42501") return;
      current = record.cause;
    }
    throw new Error(`${label} failed for a non-permission error`);
  }
  throw new Error(`${label} unexpectedly succeeded after its Postgres grant was revoked`);
}

/**
 * Exercise MFA app binders under live Postgres (not only raw `now()` SQL).
 * Catches Date#toString binds and missing GRANTs that unit/memory paths miss.
 */
async function exerciseMfaAppBinders(
  owner: ReturnType<typeof postgres>,
): Promise<void> {
  process.env.AUTH_USERS_BACKEND = "postgres";
  if (!process.env.AUTH_TOTP_ENCRYPTION_KEY?.trim()) {
    // Deterministic 32-byte key for smoke only (not a production secret).
    process.env.AUTH_TOTP_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  }

  await owner`delete from mfa_verification_attempts where user_id = ${PRESIDENT}`;
  try {
    const attempts = await Promise.all(
      Array.from({ length: 5 }, () => reserveMfaVerificationAttempt(PRESIDENT)),
    );
    if (attempts.some((attempt) => !attempt.allowed)) {
      throw new Error("MFA app binder failed: concurrent attempt reservation denied president");
    }
    const persistedAttempt = await owner<{ attempt_count: number }[]>`
      select attempt_count from mfa_verification_attempts where user_id = ${PRESIDENT}
    `;
    if (persistedAttempt.length !== 1 || Number(persistedAttempt[0].attempt_count) !== 5) {
      throw new Error("MFA app binder failed: concurrent attempts were lost or not durably persisted");
    }
  } finally {
    await owner`delete from mfa_verification_attempts where user_id = ${PRESIDENT}`;
  }

  await owner.unsafe("REVOKE INSERT ON mfa_verification_attempts FROM unionops_app");
  try {
    await expectMfaPermissionFailure(
      () => reserveMfaVerificationAttempt(PRESIDENT),
      "verification attempt write outage",
    );
  } finally {
    await owner.unsafe("GRANT INSERT ON mfa_verification_attempts TO unionops_app");
  }
  const failedAttemptWrite = await owner<{ user_id: string }[]>`
    select user_id from mfa_verification_attempts where user_id = ${PRESIDENT}
  `;
  if (failedAttemptWrite.length !== 0) {
    throw new Error("MFA failure smoke: failed attempt write left durable state");
  }

  const pendingSecret = "JBSWY3DPEHPK3PXP";
  await setPendingSecret(PRESIDENT, pendingSecret);
  const persistedPending = await owner<{ secret: string; expires_at: Date }[]>`
    select secret, expires_at from mfa_pending_enrollments where user_id = ${PRESIDENT}
  `;
  if (
    persistedPending.length !== 1 ||
    !isEncryptedTotpSecret(persistedPending[0].secret) ||
    persistedPending[0].expires_at.getTime() <= Date.now()
  ) {
    throw new Error("MFA app binder failed: encrypted pending enrollment was not durably persisted");
  }
  if (
    runMfaWorker({
      action: "read-pending",
      userId: PRESIDENT,
      expectedSecret: pendingSecret,
    }) !== "pending-ok"
  ) {
    throw new Error("MFA app binder failed: a fresh process could not read pending enrollment");
  }
  const roundTrip = await getPendingSecret(PRESIDENT);
  if (roundTrip !== pendingSecret) {
    throw new Error("MFA app binder failed: pending enrollment round-trip mismatch");
  }
  await clearPendingSecret(PRESIDENT);
  const clearedPending = await owner<{ secret: string; expires_at: Date }[]>`
    select secret, expires_at from mfa_pending_enrollments where user_id = ${PRESIDENT}
  `;
  if (
    clearedPending.length !== 1 ||
    clearedPending[0].secret === persistedPending[0].secret ||
    clearedPending[0].expires_at.getTime() !== 0
  ) {
    throw new Error("MFA app binder failed: pending enrollment clear was not durably persisted");
  }

  await owner`delete from mfa_session_grants where user_id = ${PRESIDENT}`;
  const nonce = await issueMfaGrant(PRESIDENT, Date.now(), 0);
  try {
    const persistedGrant = await owner<{ token_hash: string; consumed_at: Date | null }[]>`
      select token_hash, consumed_at from mfa_session_grants where user_id = ${PRESIDENT}
    `;
    const expectedHash = createHash("sha256").update(nonce, "utf8").digest("hex");
    if (
      persistedGrant.length !== 1 ||
      persistedGrant[0].token_hash !== expectedHash ||
      persistedGrant[0].consumed_at !== null
    ) {
      throw new Error("MFA app binder failed: hashed session grant was not durably persisted");
    }
    if (
      runMfaWorker({ action: "consume-grant", userId: PRESIDENT, nonce }) !== "consumed" ||
      (await consumeMfaGrant(PRESIDENT, nonce, Date.now(), 0))
    ) {
      throw new Error("MFA app binder failed: grant did not survive a process handoff as single-use");
    }
    const handedOffGrant = await owner<{ consumed_at: Date | null }[]>`
      select consumed_at from mfa_session_grants where user_id = ${PRESIDENT}
    `;
    if (handedOffGrant.length !== 1 || !handedOffGrant[0].consumed_at) {
      throw new Error("MFA app binder failed: second-process grant consumption was not durable");
    }

    await owner`delete from mfa_session_grants where user_id = ${PRESIDENT}`;
    const raceNonce = await issueMfaGrant(PRESIDENT, Date.now(), 0);
    const consumeResults = await Promise.all([
      consumeMfaGrant(PRESIDENT, raceNonce, Date.now(), 0),
      consumeMfaGrant(PRESIDENT, raceNonce, Date.now(), 0),
    ]);
    if (consumeResults.filter(Boolean).length !== 1) {
      throw new Error("MFA app binder failed: concurrent grant consumption was not single-use");
    }
    const consumedGrant = await owner<{ consumed_at: Date | null }[]>`
      select consumed_at from mfa_session_grants where user_id = ${PRESIDENT}
    `;
    if (consumedGrant.length !== 1 || !consumedGrant[0].consumed_at) {
      throw new Error("MFA app binder failed: grant consumption was not durably persisted");
    }

    await owner`delete from mfa_pending_enrollments where user_id = ${PRESIDENT}`;
    await owner.unsafe("REVOKE INSERT ON mfa_pending_enrollments FROM unionops_app");
    try {
      await expectMfaPermissionFailure(
        () => setPendingSecret(PRESIDENT, pendingSecret),
        "pending enrollment write outage",
      );
    } finally {
      await owner.unsafe("GRANT INSERT ON mfa_pending_enrollments TO unionops_app");
    }
    const failedPendingWrite = await owner<{ user_id: string }[]>`
      select user_id from mfa_pending_enrollments where user_id = ${PRESIDENT}
    `;
    if (failedPendingWrite.length !== 0 || (await getPendingSecret(PRESIDENT)) !== null) {
      throw new Error("MFA failure smoke: failed pending write left a memory or database success");
    }

    await setPendingSecret(PRESIDENT, pendingSecret);
    const pendingBeforeFailedClear = await owner<{ secret: string }[]>`
      select secret from mfa_pending_enrollments where user_id = ${PRESIDENT}
    `;
    await owner.unsafe("REVOKE UPDATE ON mfa_pending_enrollments FROM unionops_app");
    try {
      await expectMfaPermissionFailure(
        () => clearPendingSecret(PRESIDENT),
        "pending enrollment clear outage",
      );
    } finally {
      await owner.unsafe("GRANT UPDATE ON mfa_pending_enrollments TO unionops_app");
    }
    const pendingAfterFailedClear = await owner<{ secret: string }[]>`
      select secret from mfa_pending_enrollments where user_id = ${PRESIDENT}
    `;
    if (
      pendingBeforeFailedClear.length !== 1 ||
      pendingAfterFailedClear.length !== 1 ||
      pendingAfterFailedClear[0].secret !== pendingBeforeFailedClear[0].secret
    ) {
      throw new Error("MFA failure smoke: failed pending clear changed durable enrollment state");
    }
    await clearPendingSecret(PRESIDENT);

    await owner`delete from mfa_session_grants where user_id = ${PRESIDENT}`;
    await owner.unsafe("REVOKE INSERT ON mfa_session_grants FROM unionops_app");
    try {
      await expectMfaPermissionFailure(
        () => issueMfaGrant(PRESIDENT, Date.now(), 0),
        "session grant issue outage",
      );
    } finally {
      await owner.unsafe("GRANT INSERT ON mfa_session_grants TO unionops_app");
    }
    const failedIssueRows = await owner<{ user_id: string }[]>`
      select user_id from mfa_session_grants where user_id = ${PRESIDENT}
    `;
    if (failedIssueRows.length !== 0 || getMfaGrant(PRESIDENT)) {
      throw new Error("MFA failure smoke: failed grant issue left durable or in-memory success");
    }

    const unconsumedNonce = await issueMfaGrant(PRESIDENT, Date.now(), 0);
    await owner.unsafe("REVOKE UPDATE ON mfa_session_grants FROM unionops_app");
    try {
      await expectMfaPermissionFailure(
        () => consumeMfaGrant(PRESIDENT, unconsumedNonce, Date.now(), 0),
        "session grant consume outage",
      );
    } finally {
      await owner.unsafe("GRANT UPDATE ON mfa_session_grants TO unionops_app");
    }
    const afterFailedConsume = await owner<{ token_hash: string; consumed_at: Date | null }[]>`
      select token_hash, consumed_at from mfa_session_grants where user_id = ${PRESIDENT}
    `;
    const unconsumedHash = createHash("sha256").update(unconsumedNonce, "utf8").digest("hex");
    if (
      afterFailedConsume.length !== 1 ||
      afterFailedConsume[0].token_hash !== unconsumedHash ||
      afterFailedConsume[0].consumed_at !== null
    ) {
      throw new Error("MFA failure smoke: failed grant consume mutated durable grant state");
    }

    const recoveryStateBefore = await owner<{
      session_version: number;
      active_code_count: number;
    }[]>`
      select
        u.session_version,
        (select count(*)::int from mfa_recovery_codes c where c.user_id = u.id and c.used_at is null) as active_code_count
      from users u where u.id = ${PRESIDENT}
    `;
    await owner.unsafe("REVOKE INSERT ON mfa_recovery_codes FROM unionops_app");
    try {
      await expectMfaPermissionFailure(
        () => rotateMfaRecoveryCodes(PRESIDENT),
        "recovery-code rotation outage",
      );
    } finally {
      await owner.unsafe("GRANT INSERT ON mfa_recovery_codes TO unionops_app");
    }
    const recoveryStateAfter = await owner<{
      session_version: number;
      active_code_count: number;
    }[]>`
      select
        u.session_version,
        (select count(*)::int from mfa_recovery_codes c where c.user_id = u.id and c.used_at is null) as active_code_count
      from users u where u.id = ${PRESIDENT}
    `;
    if (
      recoveryStateBefore.length !== 1 ||
      recoveryStateAfter.length !== 1 ||
      recoveryStateAfter[0].session_version !== recoveryStateBefore[0].session_version ||
      recoveryStateAfter[0].active_code_count !== recoveryStateBefore[0].active_code_count
    ) {
      throw new Error("MFA failure smoke: failed recovery rotation partially committed");
    }
  } finally {
    await owner`delete from mfa_session_grants where user_id = ${PRESIDENT}`;
  }
}

function assertOutreachMigrationArtifacts(): void {
  const migrationPath = join(
    process.cwd(),
    "src/lib/db/migrations/0088_outreach_lists.sql",
  );
  const sql = readFileSync(migrationPath, "utf8");
  for (const needle of [
    "outreach_lists_tenant",
    "outreach_action_tokens",
    "outreach_confirm_from_token",
  ]) {
    if (needle === "outreach_confirm_from_token") {
      const confirmPath = join(
        process.cwd(),
        "src/lib/db/migrations/0089_outreach_confirm.sql",
      );
      const confirmSql = readFileSync(confirmPath, "utf8");
      if (!confirmSql.includes(needle)) {
        throw new Error(`Outreach confirm migration missing ${needle}`);
      }
      continue;
    }
    if (!sql.includes(needle)) {
      throw new Error(`Outreach migration missing ${needle}`);
    }
  }
  const adminRlsPath = join(
    process.cwd(),
    "src/lib/db/migrations/0094_outreach_lists_admin_rls.sql",
  );
  const adminRls = readFileSync(adminRlsPath, "utf8");
  if (!adminRls.includes("public.customization_root(NULL, true)")) {
    throw new Error(
      "Outreach admin RLS migration missing customization_root Site Admin bypass",
    );
  }
}

const UNION = "union-b7p";
const LOCAL = "local-7";
const PRESIDENT = "user-president-7";
const LOCAL_MEMBER = "user-member-7";
const OTHER_LOCAL_MEMBER = "user-president-1337";

async function main(): Promise<void> {
  assertOutreachMigrationArtifacts();
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required (use unionops_app credentials)");
  const ownerUrl = process.env.MIGRATE_DATABASE_URL?.trim();
  if (!ownerUrl) throw new Error("MIGRATE_DATABASE_URL is required for independent MFA persistence assertions");

  const sql = postgres(url, { max: 1 });
  const owner = postgres(ownerUrl, { max: 1 });
  const fixtureId = `grev-rls-smoke-${randomUUID()}`;
  const committeeId = `com-rls-smoke-${randomUUID()}`;
  const committeeMembershipId = `cm-rls-smoke-${randomUUID()}`;
  const recoveryCodeId = `mfa-rls-smoke-${randomUUID()}`;
  try {
    const [{ user, bypass }] = await sql<{ user: string; bypass: boolean }[]>`
      select current_user as user,
        coalesce((select rolbypassrls from pg_roles where rolname = current_user), false) as bypass
    `;
    if (user !== APP_DB_ROLE) throw new Error(`Expected current_user=${APP_DB_ROLE}, got ${user}`);
    if (bypass) throw new Error(`${APP_DB_ROLE} unexpectedly has BYPASSRLS`);

    await sql`select set_config('app.current_union_id', ${UNION}, false)`;
    await sql`select set_config('app.current_local_id', ${LOCAL}, false)`;
    await sql`select set_config('app.current_user_id', ${PRESIDENT}, false)`;
    await sql`select set_config('app.current_cross_local', 'false', false)`;
    await sql`select set_config('app.current_mfa_verified', 'true', false)`;
    const restrictedIncidents = await sql<{ id: string }[]>`
      select id from platform_incidents limit 1
    `;
    if (restrictedIncidents.length !== 0) {
      throw new Error("Incident RLS failed: a union-scoped president could read the platform incident register");
    }
    const restrictedStepUpGrants = await sql<{ id: string }[]>`
      select id from platform_incident_step_up_grants limit 1
    `;
    if (restrictedStepUpGrants.length !== 0) {
      throw new Error("Incident step-up RLS failed: a union-scoped president could read platform grants");
    }
    await sql`
      insert into mfa_recovery_codes (id, user_id, code_hash)
      values (${recoveryCodeId}, ${PRESIDENT}, ${randomUUID().replaceAll("-", "")})
    `;
    const ownRecoveryCode = await sql<{ id: string }[]>`
      select id from mfa_recovery_codes where id = ${recoveryCodeId}
    `;
    if (ownRecoveryCode.length !== 1) {
      throw new Error("MFA recovery-code RLS failed: account could not read its own record");
    }
    await sql`select set_config('app.current_user_id', ${LOCAL_MEMBER}, false)`;
    const crossAccountRecoveryCode = await sql<{ id: string }[]>`
      select id from mfa_recovery_codes where id = ${recoveryCodeId}
    `;
    if (crossAccountRecoveryCode.length !== 0) {
      throw new Error("MFA recovery-code RLS failed: another account could read the record");
    }
    let crossAccountRecoveryInsertRejected = false;
    try {
      await sql`
        insert into mfa_recovery_codes (id, user_id, code_hash)
        values (${`mfa-rls-cross-${randomUUID()}`}, ${PRESIDENT}, ${randomUUID().replaceAll("-", "")})
      `;
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "42501")) {
        throw error;
      }
      crossAccountRecoveryInsertRejected = true;
    }
    if (!crossAccountRecoveryInsertRejected) {
      throw new Error("MFA recovery-code RLS failed: another account could create a record for this account");
    }
    await sql`select set_config('app.current_user_id', ${PRESIDENT}, false)`;
    try {
      await sql.begin(async (tx) => {
        const expectPermissionDenied = async (
          run: (savepoint: typeof tx) => Promise<unknown>,
          message: string,
        ) => {
          let denied = false;
          try {
            await tx.savepoint(run);
          } catch (error) {
            if (!(error && typeof error === "object" && "code" in error && error.code === "42501")) {
              throw error;
            }
            denied = true;
          }
          if (!denied) throw new Error(message);
        };
        const auditId = `audit-rls-smoke-${randomUUID()}`;
        const auditRequestId = randomUUID();
        await tx`
          insert into audit_log (
            id, user_id, action, resource_type, resource_id, union_id, local_id,
            outcome, request_id
          ) values (
            ${auditId}, ${PRESIDENT}, 'rls.smoke', 'session', ${PRESIDENT},
            ${UNION}, ${LOCAL}, 'denied', ${auditRequestId}
          )
        `;
        const ownAudit = await tx<{ outcome: string; request_id: string }[]>`
          select outcome, request_id from audit_log where id = ${auditId}
        `;
        if (ownAudit.length !== 1 || ownAudit[0].outcome !== "denied" || ownAudit[0].request_id !== auditRequestId) {
          throw new Error("Audit RLS/schema failed: outcome or request correlation could not be read");
        }
        await expectPermissionDenied(
          (savepoint) => savepoint`update audit_log set outcome = 'success' where id = ${auditId}`,
          "Audit append-only permissions failed: runtime could update an event",
        );
        await expectPermissionDenied(
          (savepoint) => savepoint`delete from audit_log where id = ${auditId}`,
          "Audit append-only permissions failed: runtime could delete an event",
        );
        await tx`select set_config('app.current_union_id', 'union-other', true)`;
        const crossUnionAudit = await tx<{ id: string }[]>`
          select id from audit_log where id = ${auditId}
        `;
        if (crossUnionAudit.length !== 0) {
          throw new Error("Audit RLS failed: another union could read an event");
        }
        await tx`select set_config('app.current_union_id', ${UNION}, true)`;
        await tx`
          insert into mfa_totp_counters (user_id, last_counter)
          values (${PRESIDENT}, 99999999)
          on conflict (user_id) do update set last_counter = excluded.last_counter
        `;
        const ownTotpCounter = await tx<{ user_id: string }[]>`
          select user_id from mfa_totp_counters where user_id = ${PRESIDENT}
        `;
        if (ownTotpCounter.length !== 1) {
          throw new Error("MFA TOTP-counter RLS failed: account could not read its own state");
        }
        await expectPermissionDenied(
          (savepoint) => savepoint`delete from mfa_totp_counters where user_id = ${PRESIDENT}`,
          "MFA TOTP-counter RLS failed: account could delete its replay state",
        );

        await tx`select set_config('app.current_user_id', ${LOCAL_MEMBER}, false)`;
        const crossAccountTotpCounter = await tx<{ user_id: string }[]>`
          select user_id from mfa_totp_counters where user_id = ${PRESIDENT}
        `;
        if (crossAccountTotpCounter.length !== 0) {
          throw new Error("MFA TOTP-counter RLS failed: another account could read the state");
        }
        await expectPermissionDenied(
          (savepoint) => savepoint`
            insert into mfa_totp_counters (user_id, last_counter)
            values (${PRESIDENT}, 100000000)
            on conflict (user_id) do update set last_counter = excluded.last_counter
          `,
          "MFA TOTP-counter RLS failed: another account could modify the state",
        );

        await tx`select set_config('app.current_user_id', ${PRESIDENT}, false)`;
        const tokenHash = randomUUID().replaceAll("-", "").padEnd(64, "a");
        await tx`
          insert into mfa_session_grants (
            user_id, token_hash, session_version, issued_at, expires_at
          ) values (
            ${PRESIDENT}, ${tokenHash}, 0, now(), now() + interval '60 seconds'
          )
          on conflict (user_id) do update set
            token_hash = excluded.token_hash,
            session_version = excluded.session_version,
            issued_at = excluded.issued_at,
            expires_at = excluded.expires_at,
            consumed_at = null
        `;
        const ownSessionGrant = await tx<{ user_id: string }[]>`
          select user_id from mfa_session_grants where user_id = ${PRESIDENT}
        `;
        if (ownSessionGrant.length !== 1) {
          throw new Error("MFA session-grant RLS failed: account could not read its own grant");
        }
        await expectPermissionDenied(
          (savepoint) => savepoint`delete from mfa_session_grants where user_id = ${PRESIDENT}`,
          "MFA session-grant RLS failed: account could delete its grant state",
        );

        await tx`select set_config('app.current_user_id', ${LOCAL_MEMBER}, false)`;
        const crossAccountSessionGrant = await tx<{ user_id: string }[]>`
          select user_id from mfa_session_grants where user_id = ${PRESIDENT}
        `;
        if (crossAccountSessionGrant.length !== 0) {
          throw new Error("MFA session-grant RLS failed: another account could read the grant");
        }
        await expectPermissionDenied(
          (savepoint) => savepoint`
            insert into mfa_session_grants (
              user_id, token_hash, session_version, issued_at, expires_at
            ) values (
              ${PRESIDENT}, ${randomUUID().replaceAll("-", "").padEnd(64, "b")},
              0, now(), now() + interval '60 seconds'
            )
          `,
          "MFA session-grant RLS failed: another account could create a grant for this account",
        );

        await tx`select set_config('app.current_user_id', ${PRESIDENT}, false)`;
        await tx`
          insert into mfa_verification_attempts (user_id, window_started_at, attempt_count)
          values (${PRESIDENT}, now(), 1)
          on conflict (user_id) do update set
            window_started_at = excluded.window_started_at,
            attempt_count = excluded.attempt_count
        `;
        const ownAttemptLimit = await tx<{ user_id: string }[]>`
          select user_id from mfa_verification_attempts where user_id = ${PRESIDENT}
        `;
        if (ownAttemptLimit.length !== 1) {
          throw new Error("MFA attempt-limit RLS failed: account could not read its own state");
        }
        await expectPermissionDenied(
          (savepoint) => savepoint`delete from mfa_verification_attempts where user_id = ${PRESIDENT}`,
          "MFA attempt-limit RLS failed: account could delete its limit state",
        );
        await tx`select set_config('app.current_user_id', ${LOCAL_MEMBER}, false)`;
        const crossAccountAttemptLimit = await tx<{ user_id: string }[]>`
          select user_id from mfa_verification_attempts where user_id = ${PRESIDENT}
        `;
        if (crossAccountAttemptLimit.length !== 0) {
          throw new Error("MFA attempt-limit RLS failed: another account could read the state");
        }
        await expectPermissionDenied(
          (savepoint) => savepoint`
            insert into mfa_verification_attempts (user_id, window_started_at, attempt_count)
            values (${PRESIDENT}, now(), 1)
          `,
          "MFA attempt-limit RLS failed: another account could create state for this account",
        );

        await tx`select set_config('app.current_user_id', ${PRESIDENT}, false)`;
        await tx`
          insert into mfa_pending_enrollments (user_id, secret, expires_at)
          values (${PRESIDENT}, 'JBSWY3DPEHPK3PXP', now() + interval '10 minutes')
          on conflict (user_id) do update set
            secret = excluded.secret,
            expires_at = excluded.expires_at
        `;
        const ownPendingEnrollment = await tx<{ user_id: string }[]>`
          select user_id from mfa_pending_enrollments where user_id = ${PRESIDENT}
        `;
        if (ownPendingEnrollment.length !== 1) {
          throw new Error("MFA pending-enrollment RLS failed: account could not read its own secret");
        }
        await expectPermissionDenied(
          (savepoint) => savepoint`delete from mfa_pending_enrollments where user_id = ${PRESIDENT}`,
          "MFA pending-enrollment RLS failed: account could delete its pending secret",
        );
        await tx`select set_config('app.current_user_id', ${LOCAL_MEMBER}, false)`;
        const crossAccountPending = await tx<{ user_id: string }[]>`
          select user_id from mfa_pending_enrollments where user_id = ${PRESIDENT}
        `;
        if (crossAccountPending.length !== 0) {
          throw new Error("MFA pending-enrollment RLS failed: another account could read the secret");
        }
        await expectPermissionDenied(
          (savepoint) => savepoint`
            insert into mfa_pending_enrollments (user_id, secret, expires_at)
            values (${PRESIDENT}, 'JBSWY3DPEHPK3PXP', now() + interval '10 minutes')
          `,
          "MFA pending-enrollment RLS failed: another account could write this pending secret",
        );

        throw new Error("__ROLLBACK_MFA_TOTP_RLS_SMOKE__");
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "__ROLLBACK_MFA_TOTP_RLS_SMOKE__") {
        throw error;
      }
    }
    await sql`select set_config('app.current_user_id', ${PRESIDENT}, false)`;
    await sql`
      insert into committees (id, union_id, local_id, name, member_officer_ids)
      values (${committeeId}, ${UNION}, ${LOCAL}, 'RLS Smoke Committee', '[]'::jsonb)
    `;
    await sql`
      insert into committee_memberships (id, committee_id, union_id, local_id, user_id)
      values (${committeeMembershipId}, ${committeeId}, ${UNION}, ${LOCAL}, ${LOCAL_MEMBER})
    `;
    const linked = await sql<{ user_id: string }[]>`
      select user_id from committee_memberships where id = ${committeeMembershipId}
    `;
    if (linked.length !== 1 || linked[0].user_id !== LOCAL_MEMBER) {
      throw new Error("Committee RLS failed: active same-local membership was not linked");
    }

    let wrongLocalRejected = false;
    try {
      await sql`
        insert into committee_memberships (id, committee_id, union_id, local_id, user_id)
        values (${`cm-wrong-local-${randomUUID()}`}, ${committeeId}, ${UNION}, ${LOCAL}, ${OTHER_LOCAL_MEMBER})
      `;
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "42501")) {
        throw error;
      }
      wrongLocalRejected = true;
    }
    if (!wrongLocalRejected) {
      throw new Error("Committee RLS failed: a different-local account was linked");
    }

    await sql`
      insert into grievances (
        id, union_id, local_id, bargaining_unit_id, member_pseudonym,
        category, status, current_step, filed_at, assigned_steward_id,
        created_by_id, updated_at
      ) values (
        ${fixtureId}, ${UNION}, ${LOCAL}, 'bu-7-ft', 'RLS Smoke',
        'rls-smoke', 'open', 1, now(), 'user-steward-7', ${PRESIDENT}, now()
      )
    `;

    await sql`select set_config('app.current_union_id', 'union-other', false)`;
    await sql`select set_config('app.current_local_id', 'local-other', false)`;
    const crossUnion = await sql<{ id: string }[]>`select id from grievances where id = ${fixtureId}`;
    if (crossUnion.length !== 0) throw new Error("RLS failed: cross-union grievance read succeeded");

    await sql`select set_config('app.current_union_id', ${UNION}, false)`;
    await sql`select set_config('app.current_local_id', '', false)`;
    const missingLocal = await sql<{ id: string }[]>`select id from grievances where id = ${fixtureId}`;
    if (missingLocal.length !== 0) throw new Error("RLS failed: missing local scope expanded grievance access");
    const committeeMissingLocal = await sql<{ id: string }[]>`select id from committees where id = ${committeeId}`;
    if (committeeMissingLocal.length !== 0) throw new Error("Committee RLS failed: missing local scope exposed a committee");

    await sql`select set_config('app.current_local_id', 'local-404', false)`;
    const wrongLocal = await sql<{ id: string }[]>`select id from grievances where id = ${fixtureId}`;
    if (wrongLocal.length !== 0) throw new Error("RLS failed: wrong local scope read a grievance");

    await sql`select set_config('app.current_local_id', ${LOCAL}, false)`;
    const sameScope = await sql<{ id: string }[]>`select id from grievances where id = ${fixtureId}`;
    if (sameScope.length !== 1) throw new Error(`RLS failed: matching officer scope returned ${sameScope.length} rows`);

    // App-code MFA binders (attempt upsert ISO binds, pending/grant DML under RLS).
    await exerciseMfaAppBinders(owner);

    await sql`delete from committees where id = ${committeeId}`;
    await sql`delete from grievances where id = ${fixtureId}`;
    await sql`delete from mfa_recovery_codes where id = ${recoveryCodeId}`;
    console.log("[rls-smoke] ok — app role, grievance/committee/audit scope, append-only audit, account-scoped recovery/TOTP/grant/attempt-limit RLS, MFA app binders, and non-platform incident denial passed");
  } finally {
    await sql`select set_config('app.current_union_id', ${UNION}, false)`;
    await sql`select set_config('app.current_local_id', ${LOCAL}, false)`;
    await sql`select set_config('app.current_user_id', ${PRESIDENT}, false)`;
    await sql`delete from committees where id = ${committeeId}`;
    await sql`delete from grievances where id = ${fixtureId}`;
    await sql`delete from mfa_recovery_codes where id = ${recoveryCodeId}`;
    await sql.end({ timeout: 5 });
    await owner.end({ timeout: 5 });
    resetDbClient();
  }
}

main().catch((error) => {
  console.error("[rls-smoke] failed:", error);
  process.exitCode = 1;
});
