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
import { resetMfaEnrollmentStoreForTests } from "@/lib/auth/mfa-enrollment-store";
import { resetMfaRecoveryCodesForTests, rotateMfaRecoveryCodes } from "@/lib/auth/mfa-recovery-codes";
import { clearMfaGrants } from "@/lib/auth/mfa-grants";
import { resetMfaVerificationAttemptsForTests } from "@/lib/auth/mfa-attempt-limits";
import { auditLog, resetAuditLog } from "@/lib/audit/store";
import { resetMemoryAuditLogForTests } from "@/lib/audit/memory-adapter";
import { resetMfaTotpCountersForTests } from "@/lib/auth/mfa-totp-counters";
import { getTotpSecretForUser } from "@/lib/auth/mfa-user-secret";
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
        needsEnrollment: false,
        mfaVerified: false,
        recoveryCodesRemaining: null,
      });
    });

    it("does not require TOTP enrollment for a basic local member in hosted mode", async () => {
      process.env.NODE_ENV = "production";
      process.env.UNIONOPS_HOSTED_CUSTOMER_MODE = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session({
        roles: ["local_member"],
        mfaVerified: false,
        mfaRequired: false,
      }));
      const res = await mfaStatus();
      expect(await res.json()).toMatchObject({
        enabled: true,
        required: false,
        mode: "totp",
        needsEnrollment: false,
        mfaVerified: false,
      });
    });

    it("requires TOTP for a local member who administers an active Circle", async () => {
      process.env.NODE_ENV = "production";
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
      process.env.NODE_ENV = "production";
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
      expect((await enrollMfa()).status).toBe(401);

      authMock.mockResolvedValue(session());
      const disabled = await enrollMfa();
      expect(disabled.status).toBe(503);
      expect(await disabled.json()).toEqual({
        error: "TOTP enrollment requires AUTH_MFA_MODE=totp on this instance.",
      });
    });

    it("returns a pending secret and otpauth URI without persisting until confirm", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session());

      const before = await getTotpSecretForUser("user-president-7");
      const res = await enrollMfa();
      expect(res.status).toBe(200);
      const body = (await res.json()) as { secret: string; otpauthUri: string };
      expect(body.secret).toMatch(/^[A-Z2-7]+$/);
      expect(body.otpauthUri).toContain("otpauth://totp/");
      expect(body.otpauthUri).toContain(`secret=${body.secret}`);
      expect(await getTotpSecretForUser("user-president-7")).toBe(before);
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
      expect(await badJson.json()).toEqual({ error: "Invalid code" });

      const noPending = await confirmEnroll(jsonRequest({ code: "123456" }));
      expect(noPending.status).toBe(400);
      expect(await noPending.json()).toMatchObject({
        error: expect.stringContaining("No pending enrollment"),
      });

      const enrolled = await enrollMfa();
      const { secret } = (await enrolled.json()) as { secret: string };
      const wrong = await confirmEnroll(jsonRequest({ code: "000000" }));
      expect(wrong.status).toBe(400);
      expect(await getTotpSecretForUser("user-president-7")).not.toBe(secret);
    });

    it("persists the pending secret only after a valid TOTP", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session());

      const enrolled = await enrollMfa();
      const { secret } = (await enrolled.json()) as { secret: string };
      const code = generateTotp(secret);
      const confirmed = await confirmEnroll(jsonRequest({ code }));
      expect(confirmed.status).toBe(200);
      const confirmedBody = await confirmed.json() as { success: boolean; recoveryCodes?: string[] };
      expect(confirmedBody).toMatchObject({ success: true, recoveryCodes: expect.any(Array) });
      expect(confirmedBody.recoveryCodes).toHaveLength(10);
      expect(await getTotpSecretForUser("user-president-7")).toBe(secret);
      expect((await verifyMfa(jsonRequest({ code }))).status).toBe(400);
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

    it("does not issue a second grant for a TOTP counter already accepted", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session());

      const code = generateTotp("JBSWY3DPEHPK3PXP");
      const first = await verifyMfa(jsonRequest({ code }));
      const replay = await verifyMfa(jsonRequest({ code }));

      expect(first.status).toBe(200);
      expect(replay.status).toBe(400);
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
      });
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
        needsEnrollment: true,
      });
    });

    it("accepts one recovery code once and grants MFA without returning the code", async () => {
      process.env.AUTH_MFA_ENABLED = "true";
      process.env.AUTH_MFA_MODE = "totp";
      authMock.mockResolvedValue(session({ id: "recovery-user" }));
      const [recoveryCode] = await rotateMfaRecoveryCodes("recovery-user");

      const first = await verifyMfa(jsonRequest({ code: recoveryCode }));
      expect(first.status).toBe(200);
      expect(await first.json()).toMatchObject({ success: true });
      expect((await verifyMfa(jsonRequest({ code: recoveryCode }))).status).toBe(400);
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
      expect((await rotated.json() as { recoveryCodes?: string[] }).recoveryCodes).toHaveLength(10);
    });
  });
});
