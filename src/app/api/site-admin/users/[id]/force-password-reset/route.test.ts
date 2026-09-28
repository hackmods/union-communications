import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLog: vi.fn(),
  buildPasswordResetEmail: vi.fn(),
  createPasswordResetToken: vi.fn(),
  emailAppBaseUrl: vi.fn(),
  freshMfaStepUp: vi.fn(),
  getDb: vi.fn(),
  requireSiteAdminSession: vi.fn(),
  reportApiFailure: vi.fn(),
  sendTransactionalEmail: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn((column, value) => ({ column, value })) }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/db/schema/tenant", () => ({ users: { id: "user.id" } }));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: mocks.requireSiteAdminSession,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/auth/password-reset", () => ({
  createPasswordResetToken: mocks.createPasswordResetToken,
}));
vi.mock("@/lib/email/messages", () => ({
  buildPasswordResetEmail: mocks.buildPasswordResetEmail,
  emailAppBaseUrl: mocks.emailAppBaseUrl,
}));
vi.mock("@/lib/email/send", () => ({
  sendTransactionalEmail: mocks.sendTransactionalEmail,
}));
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: mocks.reportApiFailure,
}));

import { POST } from "@/app/api/site-admin/users/[id]/force-password-reset/route";

const actor = {
  user: { id: "operator-1", roles: ["platform_admin"] },
};
const target = {
  id: "member-1",
  email: "member@example.org",
  name: "Member One",
  archivedAt: null,
  unionId: "union-1",
};

function params(id = target.id) {
  return { params: Promise.resolve({ id }) };
}

function request(body: Record<string, unknown> = {}) {
  return new Request("https://unionops.test/api/site-admin/users/member-1/force-password-reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "client-controlled",
    },
    body: JSON.stringify(body),
  });
}

function configureTarget(rows: unknown[] = [target]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  mocks.getDb.mockReturnValue({ select });
  return { select, from, where, limit };
}

describe("POST /api/site-admin/users/[id]/force-password-reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSiteAdminSession.mockResolvedValue({
      ok: true,
      session: actor,
    });
    configureTarget();
    mocks.auditLog.mockResolvedValue({});
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
    mocks.createPasswordResetToken.mockResolvedValue({
      token: "secret-reset-token",
      expiresAt: new Date("2026-09-28T00:00:00.000Z"),
    });
    mocks.emailAppBaseUrl.mockReturnValue("https://unionops.test");
    mocks.buildPasswordResetEmail.mockReturnValue({
      subject: "Reset your password",
      text: "Use https://unionops.test/app/reset-password/secret-reset-token",
      html: "<p>Use https://unionops.test/app/reset-password/secret-reset-token</p>",
    });
    mocks.sendTransactionalEmail.mockResolvedValue({ ok: true });
  });

  it("requires fresh MFA before looking up or resetting the target account", async () => {
    const response = await POST(request(), params());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mocks.sendTransactionalEmail).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: actor.user.id,
        action: "site_admin.user.force_password_reset",
        resourceType: "site_admin",
        resourceId: target.id,
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { reason: "mfa_step_up_required" },
      }),
    );
  });

  it("sends the link by transactional email without returning or auditing the token or address", async () => {
    const response = await POST(request({ mfaCode: "654321" }), params());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      sent: true,
      requestId: response.headers.get("X-Request-ID"),
    });
    expect(JSON.stringify(body)).not.toContain("secret-reset-token");
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("secret-reset-token");
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain(target.email);
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
    expect(mocks.sendTransactionalEmail).toHaveBeenCalledWith({
      to: target.email,
      subject: "Reset your password",
      text: "Use https://unionops.test/app/reset-password/secret-reset-token",
      html: "<p>Use https://unionops.test/app/reset-password/secret-reset-token</p>",
    });
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        unionId: target.unionId,
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: {
          phase: "delivery_result",
          emailSent: "true",
        },
      }),
    );
    const authorizedLog = mocks.auditLog.mock.calls.find(
      ([entry]) => entry.metadata?.phase === "delivery_authorized",
    );
    expect(authorizedLog).toBeDefined();
    expect(authorizedLog?.[0].requestId).toBe(response.headers.get("X-Request-ID"));
    expect(authorizedLog?.[0].unionId).toBe(target.unionId);
  });

  it("does not create a reset token or send email if pre-dispatch audit fails", async () => {
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(mocks.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mocks.sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("does not claim the email may have been sent when request preparation fails", async () => {
    mocks.createPasswordResetToken.mockRejectedValue(
      new Error("reset-token backend unavailable"),
    );
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(500);
    expect((await response.json()).code).toBe("reset_request_failed");
    expect(mocks.sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("does not disclose reset tokens when mail delivery fails", async () => {
    mocks.sendTransactionalEmail.mockResolvedValue({
      ok: false,
      reason: "smtp_unavailable",
    });
    const response = await POST(request({ mfaCode: "654321" }), params());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.code).toBe("email_delivery_failed");
    expect(JSON.stringify(body)).not.toContain("secret-reset-token");
    expect(JSON.stringify(body)).not.toContain(target.email);
  });

  it("warns against retry when mail succeeded but its result audit failed", async () => {
    mocks.auditLog
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("audit backend unavailable"))
      .mockRejectedValueOnce(new Error("audit backend unavailable"));
    const response = await POST(request({ mfaCode: "654321" }), params());
    const body = await response.json();

    expect(mocks.sendTransactionalEmail).toHaveBeenCalledOnce();
    expect(response.status).toBe(503);
    expect(body.code).toBe("delivery_result_unconfirmed");
    expect(JSON.stringify(body)).not.toContain("secret-reset-token");
  });

  it("does not issue a reset link to an archived account", async () => {
    configureTarget([{ ...target, archivedAt: new Date() }]);
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(409);
    expect(mocks.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mocks.sendTransactionalEmail).not.toHaveBeenCalled();
  });
});
