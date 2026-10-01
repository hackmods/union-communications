import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { POST as enrollMfa } from "@/app/api/mfa/enroll/route";
import { POST as confirmEnroll } from "@/app/api/mfa/enroll/confirm/route";
import { GET as mfaStatus } from "@/app/api/mfa/status/route";
import { POST as verifyMfa } from "@/app/api/mfa/verify/route";
import { POST as rotateRecoveryCodes } from "@/app/api/mfa/recovery-codes/route";
import { getPendingSecret, resetMfaEnrollmentStoreForTests, resetMfaPendingProcessMemoryForTests, useSharedPendingEnrollmentStoreForTests, PENDING_TTL_MS, setPendingSecret } from "@/lib/auth/mfa-enrollment-store";
import { applyTrustedSessionUpdate } from "@/lib/auth/session-update";
import { countUnusedMfaRecoveryCodes, resetMfaRecoveryCodesForTests, rotateMfaRecoveryCodes } from "@/lib/auth/mfa-recovery-codes";
import { clearMfaGrants, getMfaGrant } from "@/lib/auth/mfa-grants";
import { reserveMfaVerificationAttempt, resetMfaVerificationAttemptsForTests } from "@/lib/auth/mfa-attempt-limits";
import { auditLog, resetAuditLog } from "@/lib/audit/store";
import { resetMemoryAuditLogForTests } from "@/lib/audit/memory-adapter";
import { resetMfaTotpCountersForTests } from "@/lib/auth/mfa-totp-counters";
import { getTotpSecretForUser } from "@/lib/auth/mfa-user-secret";
import { armMfaReenrollGrace } from "@/lib/auth/mfa-reenroll-grace";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { generateTotp, matchTotpCounter } from "@/lib/auth/totp";
import { portalAdapterForMemoryTests } from "@/lib/portal/adapter";

function session(input?: {
  id?: string;
  email?: string;
    mfaVerified?: boolean;
    mfaRequired?: boolean;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-7",
      email: input?.email ?? "president.7@unionops.test",
      name: "Local 777 President",
      unionId: "union-b7p",
      localId: "local-7",
      roles: input?.roles ?? (["local_president"] as UserRole[]),
      mfaVerified: input?.mfaVerified,
      mfaRequired: input?.mfaRequired,
    },
  };
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/mfa", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("MFA API routes", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    authMock.mockReset();
    resetMfaEnrollmentStoreForTests();
    resetMfaRecoveryCodesForTests();
    resetMfaTotpCountersForTests();
    resetMfaVerificationAttemptsForTests();
    clearMfaGrants();
    resetAuditLog();
    resetMemoryAuditLogForTests();
    process.env = { ...envBackup };
    delete process.env.AUTH_MFA_ENABLED;
    delete process.env.AUTH_MFA_MODE;
    delete process.env.AUTH_MFA_CODE;
    delete process.env.AUTH_ALLOW_SHARED_MFA_IN_PROD;
    delete process.env.UNIONOPS_HOSTED_CUSTOMER_MODE;
    process.env.AUTH_USERS_BACKEND = "memory";
    delete process.env.DATABASE_URL;
    delete process.env.PORTAL_DB_BACKEND;
  });

  afterEach(() => {
    process.env = envBackup;
    resetMfaEnrollmentStoreForTests();
    resetMfaRecoveryCodesForTests();
    resetMfaTotpCountersForTests();
    resetMfaVerificationAttemptsForTests();
    clearMfaGrants();
    resetAuditLog();
    resetMemoryAuditLogForTests();
  });

  describe("GET /api/mfa/status", () => {
    it("returns 401 without a session", async () => {
      authMock.mockResolvedValue(null);
      expect((await mfaStatus()).status).toBe(401);
    });

    it("reports MFA off by default even when the session has no grant", async () => {
      authMock.mockResolvedValue(session({ mfaVerified: false }));
      const res = await mfaStatus();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        enabled: false,
        required: false,
        mode: null,
        enrolled: false,
        needsEnrollment: false,
        mfaVerified: false,
        recoveryCodesRemaining: null,
        reenrollGrace: false,
        reenrollGraceUntil: null,
      });
    });

    it("reports reset grace as a re-enrollment path without authorizing protected pages", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.UNIONOPS_HOSTED_CUSTOMER_MODE = "true";
      process.env.AUTH_MFA_MODE = "totp";
      const resetOfficer = session({
        id: "user-reenroll-grace",
        mfaVerified: false,
        mfaRequired: true,
      });
      authMock.mockResolvedValue(resetOfficer);
      await armMfaReenrollGrace(
        resetOfficer.user.id,
        Date.now() + 60_000,
      );

      const status = await mfaStatus();
      expect(await status.json()).toMatchObject({
        enabled: true,
        required: false,
        needsEnrollment: false,
        reenrollGrace: true,
      });
      expect(sessionMfaOk(resetOfficer, process.env)).toBe(false);
    });

    it("returns a stable unavailable response when enrollment status cannot be read", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session({ id: "status-unavailable-user" }));
      const userSecretModule = await import("@/lib/auth/mfa-user-secret");
      const secretRead = vi.spyOn(userSecretModule, "getTotpSecretForUser")
        .mockRejectedValueOnce(new Error("simulated secret storage failure"));
      const response = await mfaStatus();
      secretRead.mockRestore();

      expect(response.status).toBe(503);
      expect(response.headers.get("X-Request-ID")).toMatch(/^[0-9a-f-]{36}$/i);
      expect(await response.json()).toMatchObject({
        code: "status_unavailable",
        requestId: expect.any(String),
      });
    });

    it("does not require TOTP enrollment for a basic local member in hosted mode", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.UNIONOPS_HOSTED_CUSTOMER_MODE = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session({
        id: "user-member-no-mfa",
        roles: ["local_member"],
        mfaVerified: false,
        mfaRequired: false,
      }));
      const res = await mfaStatus();
      expect(await res.json()).toMatchObject({
        enabled: true,
        required: false,
        mode: "totp",
        enrolled: false,
        needsEnrollment: false,
        mfaVerified: false,
      });
    });

    it("requires TOTP for a local member who administers an active Circle", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.UNIONOPS_HOSTED_CUSTOMER_MODE = "true";
      process.env.AUTH_MFA_MODE = "totp";
      process.env.PORTAL_DB_BACKEND = "memory";
      const userId = `circle-admin-${Date.now()}`;
      authMock.mockResolvedValue(session({
        id: userId,
        roles: ["local_member"],
        mfaVerified: false,
        mfaRequired: false,
      }));
      await portalAdapterForMemoryTests().createCircle({
        unionId: "union-b7p",
        kind: "committee",
        name: `MFA status ${userId}`,
        visibility: "invited",
        createdById: userId,
        createdByName: "Circle Admin",
      });

      const res = await mfaStatus();
      expect(await res.json()).toMatchObject({
        enabled: true,
        required: true,
        mode: "totp",
        needsEnrollment: true,
        mfaVerified: false,
      });
    });

    it("requires enrollment for a privileged hosted role without TOTP", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.UNIONOPS_HOSTED_CUSTOMER_MODE = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session({
        id: "user-no-totp-secret",
        roles: ["local_president"],
        mfaVerified: false,
        mfaRequired: true,
      }));
      const res = await mfaStatus();
      expect(await res.json()).toMatchObject({
        enabled: true,
        required: true,
        mode: "totp",
        needsEnrollment: true,
        mfaVerified: false,
      });
    });
  });

  describe("POST /api/mfa/enroll", () => {
    it("returns 401 without a session and 503 when TOTP mode is off", async () => {
      authMock.mockResolvedValue(null);
      expect((await enrollMfa(jsonRequest({}))).status).toBe(401);

      authMock.mockResolvedValue(session());
      const disabled = await enrollMfa(jsonRequest({}));
      expect(disabled.status).toBe(503);
      expect(await disabled.json()).toEqual({
        error: "TOTP enrollment requires AUTH_MFA_MODE=totp on this instance.",
        code: "storage_unavailable",
      });
    });

    it("returns a pending secret for first-time enroll without a current code", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session({ id: "user-no-totp-secret" }));

      const before = await getTotpSecretForUser("user-no-totp-secret");
      expect(before).toBeNull();
      const res = await enrollMfa(jsonRequest({}));
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        secret: string;
        otpauthUri: string;
        replacing?: boolean;
      };
      expect(body.secret).toMatch(/^[A-Z2-7]+$/);
      expect(body.otpauthUri).toContain("otpauth://totp/");
      expect(body.otpauthUri).toContain(`secret=${body.secret}`);
      expect(body.replacing).toBe(false);
      expect(await getTotpSecretForUser("user-no-totp-secret")).toBeNull();
    });

    it("requires a current verification code before replacing an enrolled authenticator", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session());

      const missing = await enrollMfa(jsonRequest({}));
      expect(missing.status).toBe(400);
      expect(await missing.json()).toMatchObject({
        requiresCurrentCode: true,
      });

      const wrong = await enrollMfa(jsonRequest({ code: "000000" }));
      expect(wrong.status).toBe(400);

      const existing = await getTotpSecretForUser("user-president-7");
      expect(existing).toBeTruthy();
      const code = generateTotp(existing!);
      const res = await enrollMfa(jsonRequest({ code }));
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        secret: string;
        replacing?: boolean;
      };
      expect(body.secret).toMatch(/^[A-Z2-7]+$/);
      expect(body.replacing).toBe(true);
      expect(await getTotpSecretForUser("user-president-7")).toBe(existing);
    });
  });

  describe("POST /api/mfa/enroll/confirm", () => {
    it("rejects invalid JSON, missing pending enrollment, and a wrong code", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session());

      const badJson = await confirmEnroll(
        new Request("http://localhost/api/mfa/enroll/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      );
      expect(badJson.status).toBe(400);
      expect(await badJson.json()).toEqual({
        error: "Invalid code",
        code: "invalid",
      });

      const noPending = await confirmEnroll(jsonRequest({ code: "123456" }));
      expect(noPending.status).toBe(409);
      expect(await noPending.json()).toMatchObject({
        error: expect.stringContaining("No pending enrollment"),
        code: "no_pending",
      });

      authMock.mockResolvedValue(session({ id: "user-no-totp-secret" }));
      const enrolled = await enrollMfa(jsonRequest({}));
      const { secret } = (await enrolled.json()) as { secret: string };
      const empty = await confirmEnroll(jsonRequest({ code: "" }));
      expect(empty.status).toBe(400);
      expect(await empty.json()).toMatchObject({ code: "empty" });
      const wrong = await confirmEnroll(jsonRequest({ code: "000000" }));
      expect(wrong.status).toBe(400);
      expect(await getTotpSecretForUser("user-no-totp-secret")).not.toBe(secret);
    });

    it("persists the pending secret only after a valid TOTP", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session({ id: "user-no-totp-secret" }));

      const enrolled = await enrollMfa(jsonRequest({}));
      const { secret } = (await enrolled.json()) as { secret: string };
      const code = generateTotp(secret);
      const confirmed = await confirmEnroll(jsonRequest({ code }));
      expect(confirmed.status).toBe(200);
      const confirmedBody = await confirmed.json() as {
        success: boolean;
        recoveryCodes?: string[];
        mfaGrant?: string;
        mfaGrantIssued?: boolean;
      };
      expect(confirmedBody).toMatchObject({
        success: true,
        recoveryCodes: expect.any(Array),
        mfaGrantIssued: true,
      });
      expect(confirmedBody.recoveryCodes).toHaveLength(10);
      expect(confirmedBody.mfaGrant).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(await getTotpSecretForUser("user-no-totp-secret")).toBe(secret);
      const token = await applyTrustedSessionUpdate(
        {
          sub: "user-no-totp-secret",
          unionId: "union-b7p",
          localId: "local-7",
          roles: ["local_president"],
          mfaVerified: false,
          sessionVersion: 0,
        },
        { mfaGrant: confirmedBody.mfaGrant },
      );
      expect(token.mfaVerified).toBe(true);
      const replay = await verifyMfa(jsonRequest({ code }));
      expect(replay.status).toBe(400);
      expect(await replay.json()).toMatchObject({ code: "replayed" });
    });

    it("serializes duplicate confirmation and rotates recovery codes only once", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      const userId = "duplicate-confirm-user";
      authMock.mockResolvedValue(session({ id: userId }));

      const enrolled = await enrollMfa(jsonRequest({}));
      const { secret } = await enrolled.json() as { secret: string };
      const code = generateTotp(secret);
      const [first, duplicate] = await Promise.all([
        confirmEnroll(jsonRequest({ code })),
        confirmEnroll(jsonRequest({ code })),
      ]);
      expect([first.status, duplicate.status].sort()).toEqual([200, 409]);
      const bodies = await Promise.all([first.json(), duplicate.json()]);
      expect(bodies.find((body) => (body as { success?: boolean }).success)).toMatchObject({
        success: true,
        recoveryCodes: expect.any(Array),
      });
      expect(bodies.find((body) => (body as { code?: string }).code === "no_pending")).toMatchObject({
        code: "no_pending",
      });
      expect(await countUnusedMfaRecoveryCodes(userId)).toBe(10);
      expect(getMfaGrant(userId)).toBeDefined();
    });

    it("confirms after the process pending cache is cleared (replica split)", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session({ id: "user-replica-enroll" }));
      useSharedPendingEnrollmentStoreForTests();

      const enrolled = await enrollMfa(jsonRequest({}));
      const { secret } = (await enrolled.json()) as { secret: string };
      resetMfaPendingProcessMemoryForTests();
      const confirmed = await confirmEnroll(jsonRequest({ code: generateTotp(secret) }));
      expect(confirmed.status).toBe(200);
      expect(await getTotpSecretForUser("user-replica-enroll")).toBe(secret);
    });

    it("rejects an expired pending enrollment", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session({ id: "user-expired-enroll" }));
      await setPendingSecret(
        "user-expired-enroll",
        "JBSWY3DPEHPK3PXP",
        Date.now() - PENDING_TTL_MS - 1,
      );
      const expired = await confirmEnroll(jsonRequest({ code: "123456" }));
      expect(expired.status).toBe(409);
      expect(await expired.json()).toMatchObject({
        error: expect.stringContaining("No pending enrollment"),
      });
    });

    it("applies the shared account attempt limit before checking an enrollment code", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      const userId = "limited-enroll-confirm-user";
      authMock.mockResolvedValue(session({ id: userId }));
      const secret = "JBSWY3DPEHPK3PXP";
      await setPendingSecret(userId, secret);
      for (let attempt = 0; attempt < 10; attempt += 1) {
        expect((await reserveMfaVerificationAttempt(userId)).allowed).toBe(true);
      }

      const limited = await confirmEnroll(jsonRequest({ code: generateTotp(secret) }));
      expect(limited.status).toBe(429);
      expect(limited.headers.get("Retry-After")).toBe("900");
      expect(await limited.json()).toMatchObject({ code: "limited" });
      expect(await getPendingSecret(userId)).toBe(secret);
      expect(await getTotpSecretForUser(userId)).toBeNull();
    });

    it("fails closed in hosted mode without durable enrollment storage", async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      process.env.UNIONOPS_HOSTED_CUSTOMER_MODE = "true";
      process.env.AUTH_MFA_MODE = "totp";
      process.env.AUTH_USERS_BACKEND = "memory";
      delete process.env.DATABASE_URL;
      authMock.mockResolvedValue(session({ id: "user-no-totp-secret" }));

      const enrolled = await enrollMfa(jsonRequest({}));
      expect(enrolled.status).toBe(503);
      expect(await enrolled.json()).toMatchObject({
        error: expect.stringMatching(/QR secret|pending enrollment/i),
        code: "enrollment_store_unavailable",
      });

      const confirmed = await confirmEnroll(jsonRequest({ code: "123456" }));
      expect(confirmed.status).toBe(503);
    });
  });

  describe("POST /api/mfa/verify", () => {
    it("returns 401 without a session and 503 when MFA is disabled", async () => {
      authMock.mockResolvedValue(null);
      expect((await verifyMfa(jsonRequest({ code: "000000" }))).status).toBe(
        401,
      );

      authMock.mockResolvedValue(session());
      const disabled = await verifyMfa(jsonRequest({ code: "000000" }));
      expect(disabled.status).toBe(503);
      expect(await disabled.json()).toMatchObject({
        error: expect.stringContaining("MFA is disabled"),
      });
    });

    it("issues a server-minted grant on a valid shared code and never trusts a client boolean", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "shared_code_insecure";
      process.env.AUTH_MFA_CODE = "424242";
      authMock.mockResolvedValue(session({ mfaVerified: true }));

      const wrong = await verifyMfa(
        jsonRequest({ code: "000000", mfaVerified: true }),
      );
      expect(wrong.status).toBe(400);
      const deniedRequestId = wrong.headers.get("X-Request-ID");
      expect(deniedRequestId).toMatch(/^[0-9a-f-]{36}$/i);
      const deniedEvent = (await auditLog.query({ resourceType: "session" })).find(
        (event) => event.action === "auth.mfa_verify_failed",
      );
      expect(deniedEvent).toMatchObject({
        outcome: "denied",
        requestId: deniedRequestId,
      });
      expect(deniedEvent?.metadata).toBeUndefined();

      const ok = await verifyMfa(jsonRequest({ code: "424242" }));
      expect(ok.status).toBe(200);
      const body = (await ok.json()) as {
        success: boolean;
        mfaGrant: string;
        mfaVerified?: boolean;
      };
      expect(body.success).toBe(true);
      expect(body.mfaGrant).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(body.mfaVerified).toBeUndefined();
      const requestId = ok.headers.get("X-Request-ID");
      expect(requestId).toMatch(/^[0-9a-f-]{36}$/i);
      const events = await auditLog.query({ resourceType: "session" });
      expect(events.find((event) => event.action === "auth.mfa_verify")).toMatchObject({
        outcome: "success",
        requestId,
      });
    });

    it("keeps the first concurrent browser handoff and does not overwrite its grant", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "shared_code_insecure";
      process.env.AUTH_MFA_CODE = "424242";
      const userId = "concurrent-grant-user";
      authMock.mockResolvedValue(session({ id: userId }));

      const [first, second] = await Promise.all([
        verifyMfa(jsonRequest({ code: "424242" })),
        verifyMfa(jsonRequest({ code: "424242" })),
      ]);
      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([200, 409]);
      expect(await first.json()).toMatchObject({ success: true });
      expect(await second.json()).toMatchObject({ code: "grant_pending" });
    });

    it("does not issue a second grant for a TOTP counter already accepted", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session());

      const code = generateTotp("JBSWY3DPEHPK3PXP");
      const first = await verifyMfa(jsonRequest({ code }));
      const firstBody = await first.json() as { mfaGrant: string };
      await applyTrustedSessionUpdate({
        sub: "user-president-7",
        roles: ["local_president"],
      } as never, { mfaGrant: firstBody.mfaGrant });
      const replay = await verifyMfa(jsonRequest({ code }));

      expect(first.status).toBe(200);
      expect(replay.status).toBe(400);
      expect(await replay.json()).toMatchObject({ code: "replayed" });
    });

    it("limits repeated verification requests and returns a retry delay", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "shared_code_insecure";
      process.env.AUTH_MFA_CODE = "424242";
      authMock.mockResolvedValue(session({ id: "limited-mfa-user" }));

      for (let attempt = 0; attempt < 10; attempt += 1) {
        expect((await verifyMfa(jsonRequest({ code: "000000" }))).status).toBe(400);
      }
      const limited = await verifyMfa(jsonRequest({ code: "424242" }));
      expect(limited.status).toBe(429);
      expect(limited.headers.get("Retry-After")).toBe("900");
      expect(await limited.json()).toMatchObject({
        error: expect.stringContaining("Too many verification attempts"),
        code: "limited",
      });
    });

    it("rejects empty and junk codes without treating them as recovery", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session());

      const empty = await verifyMfa(jsonRequest({ code: "" }));
      expect(empty.status).toBe(400);
      expect(await empty.json()).toMatchObject({ code: "empty" });

      const junk = await verifyMfa(jsonRequest({ code: "nope" }));
      expect(junk.status).toBe(400);
      expect(await junk.json()).toMatchObject({ code: "invalid" });

      for (let attempt = 0; attempt < 12; attempt += 1) {
        expect((await verifyMfa(jsonRequest({ code: "" }))).status).toBe(400);
      }
    });

    it("returns needsEnrollment when TOTP is on but the account has no secret", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(
        session({ id: "user-solo", email: "solo@example.ca" }),
      );
      const res = await verifyMfa(jsonRequest({ code: "123456" }));
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({
        error: "TOTP is not enrolled for this account.",
        code: "not_enrolled",
        needsEnrollment: true,
      });
    });

    it("accepts one recovery code once and grants MFA without returning the code", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session({ id: "recovery-user" }));
      const [recoveryCode] = await rotateMfaRecoveryCodes("recovery-user");

      const invalid = await verifyMfa(jsonRequest({ code: "ZZZZ-ZZZZ-ZZZZ-ZZZZ" }));
      expect(invalid.status).toBe(400);
      expect(invalid.headers.get("X-Request-ID")).toBeTruthy();
      const first = await verifyMfa(jsonRequest({ code: recoveryCode }));
      expect(first.status).toBe(200);
      expect(await first.json()).toMatchObject({ success: true });
      expect((await verifyMfa(jsonRequest({ code: recoveryCode }))).status).toBe(409);
    });

    it("rotates recovery codes only after a fresh TOTP challenge", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session({ id: "recovery-user" }));
      const { persistTotpSecretForUser } = await import("@/lib/auth/mfa-user-secret");
      const { generateTotpSecret } = await import("@/lib/auth/mfa-enrollment");
      const secret = generateTotpSecret();
      const verifiedAt = Date.now();
      const enrollmentCode = generateTotp(secret, verifiedAt - 30_000);
      const acceptedCounter = matchTotpCounter(secret, enrollmentCode, verifiedAt);
      if (acceptedCounter === null) throw new Error("Generated test TOTP did not match");
      await persistTotpSecretForUser("recovery-user", secret, acceptedCounter);
      await rotateMfaRecoveryCodes("recovery-user");

      const denied = await rotateRecoveryCodes(jsonRequest({ code: "000000" }));
      expect(denied.status).toBe(400);
      const deniedRequestId = denied.headers.get("X-Request-ID");
      const deniedEvent = (
        await auditLog.query({ resourceType: "user" })
      ).find(
        (event) =>
          event.action === "auth.mfa_recovery_codes_rotate" &&
          event.requestId === deniedRequestId,
      );
      expect(deniedRequestId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(deniedEvent).toMatchObject({ outcome: "denied", requestId: deniedRequestId });
      expect(deniedEvent?.metadata).toBeUndefined();
      const rotated = await rotateRecoveryCodes(
        jsonRequest({ code: generateTotp(secret, verifiedAt) }),
      );
      expect(rotated.status).toBe(200);
      const body = await rotated.json() as { recoveryCodes?: string[]; mfaGrant?: string };
      expect(body.recoveryCodes).toHaveLength(10);
      expect(body.mfaGrant).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const refreshed = await applyTrustedSessionUpdate({
        sub: "recovery-user",
        sessionVersion: 0,
        roles: ["local_president"],
      } as never, { mfaGrant: body.mfaGrant });
      expect(refreshed.mfaVerified).toBe(true);
    });
  });
});
