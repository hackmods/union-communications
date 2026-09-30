import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLog: vi.fn(),
  clearTotpEnrollmentForUser: vi.fn(),
  freshMfaStepUp: vi.fn(),
  getDb: vi.fn(),
  requireSiteAdminSession: vi.fn(),
  reportApiFailure: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn((column, value) => ({ column, value })) }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/db/schema/tenant", () => ({
  users: {
    id: "user.id",
    email: "user.email",
    archivedAt: "user.archivedAt",
    unionId: "user.unionId",
    totpSecret: "user.totpSecret",
    mfaEnabled: "user.mfaEnabled",
  },
}));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: mocks.requireSiteAdminSession,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/auth/mfa-user-secret", () => ({
  clearTotpEnrollmentForUser: mocks.clearTotpEnrollmentForUser,
}));
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: mocks.reportApiFailure,
}));

import { POST } from "@/app/api/site-admin/users/[id]/reset-mfa/route";

const actor = {
  user: { id: "operator-1", roles: ["platform_admin"] },
};
const target = {
  id: "member-1",
  email: "member@example.org",
  archivedAt: null,
  unionId: "union-1",
  totpSecret: "SECRETBASE32",
  mfaEnabled: true,
};

function params(id = target.id) {
  return { params: Promise.resolve({ id }) };
}

function request(body: Record<string, unknown> = {}) {
  return new Request(
    "https://unionops.test/api/site-admin/users/member-1/reset-mfa",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": "client-controlled",
      },
      body: JSON.stringify(body),
    },
  );
}

function configureTarget(rows: unknown[] = [target]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  mocks.getDb.mockReturnValue({ select });
  return { select, from, where, limit };
}

describe("POST /api/site-admin/users/[id]/reset-mfa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSiteAdminSession.mockResolvedValue({
      ok: true,
      session: actor,
    });
    configureTarget();
    mocks.auditLog.mockResolvedValue({});
    mocks.clearTotpEnrollmentForUser.mockResolvedValue(undefined);
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
  });

  it("rejects missing confirm email before step-up", async () => {
    const response = await POST(request({ mfaCode: "123456" }), params());
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("confirm_email_required");
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.clearTotpEnrollmentForUser).not.toHaveBeenCalled();
  });

  it("rejects email mismatch before consuming the operator MFA code", async () => {
    const response = await POST(
      request({ confirmEmail: "wrong@example.org", mfaCode: "123456" }),
      params(),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("confirm_email_mismatch");
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.clearTotpEnrollmentForUser).not.toHaveBeenCalled();
  });

  it("requires fresh MFA after the target is validated", async () => {
    const response = await POST(
      request({ confirmEmail: target.email }),
      params(),
    );
    const body = await response.json();
    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(mocks.clearTotpEnrollmentForUser).not.toHaveBeenCalled();
  });

  it("clears enrollment after confirm email and step-up", async () => {
    const response = await POST(
      request({ confirmEmail: "Member@Example.org", mfaCode: "654321" }),
      params(),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      requestId: response.headers.get("X-Request-ID"),
    });
    expect(mocks.clearTotpEnrollmentForUser).toHaveBeenCalledWith(target.id);
    expect(JSON.stringify(body)).not.toContain("SECRETBASE32");
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "site_admin.user.reset_mfa",
        outcome: "success",
        metadata: { phase: "reset_complete" },
      }),
    );
  });

  it("clears enrollment without an MFA code when step-up reports operator bypass", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({
      ok: true,
      required: false,
      bypassed: true,
    });
    const response = await POST(
      request({ confirmEmail: target.email }),
      params(),
    );
    expect(response.status).toBe(200);
    expect(mocks.freshMfaStepUp).toHaveBeenCalledWith({
      userId: actor.user.id,
      code: undefined,
    });
    expect(mocks.clearTotpEnrollmentForUser).toHaveBeenCalledWith(target.id);
  });

  it("does not reset archived accounts", async () => {
    configureTarget([{ ...target, archivedAt: new Date() }]);
    const response = await POST(
      request({ confirmEmail: target.email, mfaCode: "654321" }),
      params(),
    );
    expect(response.status).toBe(409);
    expect(mocks.clearTotpEnrollmentForUser).not.toHaveBeenCalled();
  });

  it("does not reset accounts that are not enrolled", async () => {
    configureTarget([{ ...target, mfaEnabled: false, totpSecret: null }]);
    const response = await POST(
      request({ confirmEmail: target.email, mfaCode: "654321" }),
      params(),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("not_enrolled");
    expect(mocks.clearTotpEnrollmentForUser).not.toHaveBeenCalled();
  });
});
