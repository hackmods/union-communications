import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as emailStatus } from "@/app/api/auth/email-status/route";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import {
  GET as getResetToken,
  POST as resetPassword,
} from "@/app/api/auth/reset-password/[token]/route";
import { POST as signInEmail } from "@/app/api/auth/sign-in-email/route";
import { auditLog } from "@/lib/audit/store";
import { acceptInvite, createInvite, findInvitedUser, resetInviteStoreForTests } from "@/lib/auth/invites";
import { resetPasswordResetStoreForTests } from "@/lib/auth/password-reset";
import { resetSignInTokenStoreForTests } from "@/lib/auth/sign-in-link";
import { resetEmailTransportForTests } from "@/lib/email/send";

function jsonPost(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params(token: string) {
  return { params: Promise.resolve({ token }) };
}

async function seedInvitee() {
  const invite = await createInvite({
    email: "reset.officer@example.ca",
    name: "Reset Officer",
    unionId: "union-opseu",
    localId: "local-243",
    roles: ["local_steward"],
    invitedById: "admin-1",
  });
  const accepted = await acceptInvite(invite.token, "oldpassword1");
  if (!accepted.user) throw new Error("failed to accept test invite");
  return accepted.user;
}

describe("auth email and password-reset routes", () => {
  const envBackup = { ...process.env };
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  beforeEach(() => {
    resetInviteStoreForTests();
    resetPasswordResetStoreForTests();
    resetSignInTokenStoreForTests();
    resetEmailTransportForTests();
    warnSpy.mockClear();
    process.env = { ...envBackup };
    delete process.env.EMAIL_ENABLED;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.EMAIL_FROM;
  });

  afterEach(() => {
    process.env = envBackup;
    resetInviteStoreForTests();
    resetPasswordResetStoreForTests();
    resetSignInTokenStoreForTests();
    resetEmailTransportForTests();
  });

  describe("GET /api/auth/email-status", () => {
    it("returns a public SMTP snapshot with no secrets", async () => {
      process.env.EMAIL_ENABLED = "true";
      process.env.SMTP_HOST = "smtp.mailgun.org";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_USER = "postmaster@mg.example.com";
      process.env.SMTP_PASS = "super-secret-pass";
      process.env.EMAIL_FROM = "UnionOps <noreply@example.com>";

      const res = await emailStatus();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        emailEnabled: boolean;
        emailFlag: boolean;
        smtp: Record<string, unknown>;
      };
      expect(body.emailEnabled).toBe(true);
      expect(body.emailFlag).toBe(true);
      expect(body.smtp).toMatchObject({
        host: "smtp.mailgun.org",
        port: 587,
        from: "UnionOps <noreply@example.com>",
        authConfigured: true,
        userPresent: true,
        userLooksLikeEmail: true,
      });
      expect(JSON.stringify(body)).not.toContain("super-secret-pass");
      expect(body.smtp).not.toHaveProperty("pass");
      expect(body.smtp).not.toHaveProperty("password");
    });
  });

  describe("POST /api/auth/forgot-password", () => {
    it("returns 400 for invalid JSON and invalid email", async () => {
      const badJson = await forgotPassword(
        new Request("http://localhost/api/auth/forgot-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      );
      expect(badJson.status).toBe(400);
      expect(await badJson.json()).toEqual({ error: "Invalid JSON" });

      const badEmail = await forgotPassword(
        jsonPost("http://localhost/api/auth/forgot-password", {
          email: "not-an-email",
        }),
      );
      expect(badEmail.status).toBe(400);
    });

    it("does not enumerate unknown or demo emails", async () => {
      const unknown = await forgotPassword(
        jsonPost("http://localhost/api/auth/forgot-password", {
          email: "nobody@example.ca",
        }),
      );
      expect(unknown.status).toBe(200);
      const unknownBody = (await unknown.json()) as Record<string, unknown>;
      expect(unknownBody.ok).toBe(true);
      expect(unknownBody.emailSent).toBe(false);
      expect(unknownBody.smtp).toBeUndefined();
      expect(unknownBody.emailReason).toBeUndefined();

      const demo = await forgotPassword(
        jsonPost("http://localhost/api/auth/forgot-password", {
          email: "president.243@unionops.test",
        }),
      );
      expect(demo.status).toBe(200);
      const demoBody = (await demo.json()) as Record<string, unknown>;
      expect(demoBody.ok).toBe(true);
      expect(demoBody.emailSent).toBe(false);
      expect(demoBody.smtp).toBeUndefined();
    });

    it("flattens SMTP diagnostics into audit metadata without leaking the password", async () => {
      await seedInvitee();
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "super-secret-pass";
      process.env.EMAIL_FROM = "noreply@example.com";

      const res = await forgotPassword(
        jsonPost("http://localhost/api/auth/forgot-password", {
          email: "Reset.Officer@example.ca",
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        ok: boolean;
        emailSent: boolean;
        emailReason?: string;
        smtp?: { host?: string | null; authConfigured?: boolean };
      };
      expect(body.ok).toBe(true);
      expect(body.emailSent).toBe(false);
      expect(body.emailReason).toBe("not_configured");
      expect(body.smtp?.host).toBe("smtp.example.com");
      expect(body.smtp?.authConfigured).toBe(true);
      expect(JSON.stringify(body)).not.toContain("super-secret-pass");

      const logged = (await auditLog.query({ resourceType: "auth", limit: 50 })).find(
        (entry) =>
          entry.action === "email.password_reset_skipped" &&
          entry.metadata?.email === "reset.officer@example.ca",
      );
      expect(logged?.metadata).toMatchObject({
        source: "invite",
        reason: "not_configured",
        smtpHost: "smtp.example.com",
        smtpPort: "587",
        smtpFrom: "noreply@example.com",
        smtpAuthConfigured: "true",
      });
      expect(logged?.metadata?.smtpJson).toContain("smtp.example.com");
      expect(JSON.stringify(logged?.metadata)).not.toContain("super-secret-pass");
      expect(Object.values(logged?.metadata ?? {}).every((v) => typeof v === "string")).toBe(
        true,
      );
    });
  });

  describe("POST /api/auth/sign-in-email", () => {
    it("returns 400 for invalid JSON", async () => {
      const badJson = await signInEmail(
        new Request("http://localhost/api/auth/sign-in-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      );
      expect(badJson.status).toBe(400);
      expect(await badJson.json()).toEqual({ error: "Invalid JSON" });
    });

    it("does not attach SMTP diagnostics for an unknown email", async () => {
      const res = await signInEmail(
        jsonPost("http://localhost/api/auth/sign-in-email", {
          email: "nobody@example.ca",
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.ok).toBe(true);
      expect(body.emailSent).toBe(false);
      expect(body.smtp).toBeUndefined();
    });

    it("flattens SMTP diagnostics for a known demo account when mail is not configured", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "465";
      process.env.EMAIL_FROM = "noreply@example.com";

      const res = await signInEmail(
        jsonPost("http://localhost/api/auth/sign-in-email", {
          email: "president.243@unionops.test",
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        ok: boolean;
        emailSent: boolean;
        emailReason?: string;
        smtp?: { host?: string | null; port?: number | null; secure?: boolean };
      };
      expect(body.ok).toBe(true);
      expect(body.emailSent).toBe(false);
      expect(body.emailReason).toBe("not_configured");
      expect(body.smtp?.host).toBe("smtp.example.com");
      expect(body.smtp?.port).toBe(465);
      expect(body.smtp?.secure).toBe(true);

      const logged = (await auditLog.query({ resourceType: "auth", limit: 50 })).find(
        (entry) =>
          entry.action === "email.sign_in_link_skipped" &&
          entry.metadata?.email === "president.243@unionops.test",
      );
      expect(logged?.metadata).toMatchObject({
        smtpHost: "smtp.example.com",
        smtpPort: "465",
        smtpAuthConfigured: "false",
      });
      expect(Object.values(logged?.metadata ?? {}).every((v) => typeof v === "string")).toBe(
        true,
      );
    });
  });

  describe("GET/POST /api/auth/reset-password/[token]", () => {
    it("returns 404 for a missing token and pending for a live one", async () => {
      const missing = await getResetToken(
        new Request("http://localhost"),
        params("no-such-token"),
      );
      expect(missing.status).toBe(404);

      const user = await seedInvitee();
      const { createPasswordResetToken } = await import(
        "@/lib/auth/password-reset"
      );
      const row = await createPasswordResetToken({
        email: user.email,
        userId: user.id,
      });
      const pending = await getResetToken(
        new Request("http://localhost"),
        params(row.token),
      );
      expect(pending.status).toBe(200);
      const body = (await pending.json()) as { status: string; email: string };
      expect(body.status).toBe("pending");
      expect(body.email).toBe("reset.officer@example.ca");
    });

    it("rejects a short password, then consumes the token once", async () => {
      const user = await seedInvitee();
      const { createPasswordResetToken } = await import(
        "@/lib/auth/password-reset"
      );
      const row = await createPasswordResetToken({
        email: user.email,
        userId: user.id,
      });

      const short = await resetPassword(
        jsonPost("http://localhost/api/auth/reset-password/x", {
          password: "short",
        }),
        params(row.token),
      );
      expect(short.status).toBe(400);

      const ok = await resetPassword(
        jsonPost("http://localhost/api/auth/reset-password/x", {
          password: "newpassword1",
        }),
        params(row.token),
      );
      expect(ok.status).toBe(200);
      const body = (await ok.json()) as { ok: boolean; email: string };
      expect(body.ok).toBe(true);
      expect(body.email).toBe("reset.officer@example.ca");
      await expect(
        findInvitedUser("reset.officer@example.ca", "oldpassword1"),
      ).resolves.toBeNull();
      await expect(
        findInvitedUser("reset.officer@example.ca", "newpassword1"),
      ).resolves.toMatchObject({ email: "reset.officer@example.ca" });

      const reused = await resetPassword(
        jsonPost("http://localhost/api/auth/reset-password/x", {
          password: "anotherpassword1",
        }),
        params(row.token),
      );
      expect(reused.status).toBe(400);
      expect(await reused.json()).toEqual({
        error: "Reset link already used",
      });
    });
  });
});
