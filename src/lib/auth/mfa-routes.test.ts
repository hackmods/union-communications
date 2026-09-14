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
import { resetMfaEnrollmentStoreForTests } from "@/lib/auth/mfa-enrollment-store";
import { clearMfaGrants } from "@/lib/auth/mfa-grants";
import { getTotpSecretForUser } from "@/lib/auth/mfa-user-secret";
import { generateTotp } from "@/lib/auth/totp";

function session(input?: {
  id?: string;
  email?: string;
  mfaVerified?: boolean;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-243",
      email: input?.email ?? "president.243@unionops.test",
      name: "Local 243 President",
      unionId: "union-opseu",
      localId: "local-243",
      roles: input?.roles ?? (["local_president"] as UserRole[]),
      mfaVerified: input?.mfaVerified,
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
    clearMfaGrants();
    process.env = { ...envBackup };
    delete process.env.AUTH_MFA_ENABLED;
    delete process.env.AUTH_MFA_MODE;
    delete process.env.AUTH_MFA_CODE;
    delete process.env.AUTH_ALLOW_SHARED_MFA_IN_PROD;
  });

  afterEach(() => {
    process.env = envBackup;
    resetMfaEnrollmentStoreForTests();
    clearMfaGrants();
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
        mode: null,
        needsEnrollment: false,
        mfaVerified: true,
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

      const before = await getTotpSecretForUser("user-president-243");
      const res = await enrollMfa();
      expect(res.status).toBe(200);
      const body = (await res.json()) as { secret: string; otpauthUri: string };
      expect(body.secret).toMatch(/^[A-Z2-7]+$/);
      expect(body.otpauthUri).toContain("otpauth://totp/");
      expect(body.otpauthUri).toContain(`secret=${body.secret}`);
      expect(await getTotpSecretForUser("user-president-243")).toBe(before);
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
      expect(await getTotpSecretForUser("user-president-243")).not.toBe(secret);
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
      expect(await confirmed.json()).toEqual({ success: true });
      expect(await getTotpSecretForUser("user-president-243")).toBe(secret);
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

      const ok = await verifyMfa(jsonRequest({ code: "424242" }));
      expect(ok.status).toBe(200);
      const body = (await ok.json()) as {
        success: boolean;
        mfaGrant: string;
        mfaVerified?: boolean;
      };
      expect(body.success).toBe(true);
      expect(body.mfaGrant).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(body.mfaVerified).toBeUndefined();
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
  });
});
