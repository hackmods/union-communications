import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  auditLogMock,
  freshMfaStepUpMock,
  postgresMock,
  reportApiFailureMock,
  requireSiteAdminSessionMock,
  setUserRolesMock,
} = vi.hoisted(() => ({
  auditLogMock: vi.fn(),
  freshMfaStepUpMock: vi.fn(),
  postgresMock: vi.fn(),
  reportApiFailureMock: vi.fn(),
  requireSiteAdminSessionMock: vi.fn(),
  setUserRolesMock: vi.fn(),
}));

vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: requireSiteAdminSessionMock,
}));
vi.mock("@/lib/audit/store", () => ({
  auditLog: { log: auditLogMock },
}));
vi.mock("@/lib/db/client", () => ({
  isPostgresConfigured: postgresMock,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: freshMfaStepUpMock,
}));
vi.mock("@/lib/site-admin/set-user-roles", () => ({
  setUserRoles: setUserRolesMock,
}));
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: reportApiFailureMock,
}));

import { PATCH } from "@/app/api/site-admin/users/[id]/roles/route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/site-admin/users/target-user/roles", {
    method: "PATCH",
    headers: { "content-type": "application/json", "X-Request-ID": "forged" },
    body: JSON.stringify(body),
  });
}

function call(body: unknown) {
  return PATCH(request(body), {
    params: Promise.resolve({ id: "target-user" }),
  });
}

describe("PATCH /api/site-admin/users/[id]/roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postgresMock.mockReturnValue(true);
    freshMfaStepUpMock.mockImplementation(({ code }: { code?: string }) =>
      code
        ? Promise.resolve({ ok: true, required: true })
        : Promise.resolve({
            ok: false,
            status: 428,
            code: "required",
            outcome: "denied",
          }),
    );
    requireSiteAdminSessionMock.mockResolvedValue({
      ok: true,
      session: {
        user: {
          id: "platform-admin-1",
          roles: ["platform_admin"],
          unionId: "union-1",
          localId: "local-1",
        },
      },
    });
    setUserRolesMock.mockResolvedValue({
      ok: true,
      roles: ["local_steward"],
      sessionVersion: 4,
    });
    auditLogMock.mockResolvedValue({});
  });

  it("blocks a direct role-change API call until a fresh challenge is supplied", async () => {
    const response = await call({ roles: ["local_steward"] });
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("X-Request-ID")).not.toBe("forged");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(freshMfaStepUpMock).toHaveBeenCalledWith({
      userId: "platform-admin-1",
      code: undefined,
    });
    expect(setUserRolesMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "site_admin.user.set_roles",
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { reason: "mfa_step_up_required" },
      }),
    );
  });

  it("does not mutate roles after a rejected fresh challenge", async () => {
    freshMfaStepUpMock.mockResolvedValue({
      ok: false,
      status: 400,
      code: "failed",
      outcome: "denied",
    });

    const response = await call({ roles: ["local_steward"], mfaCode: "000000" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("mfa_step_up_failed");
    expect(setUserRolesMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "denied", requestId: response.headers.get("X-Request-ID") }),
    );
    expect(JSON.stringify(auditLogMock.mock.calls)).not.toContain("000000");
  });

  it("honours the MFA attempt limit before changing roles", async () => {
    freshMfaStepUpMock.mockResolvedValue({
      ok: false,
      status: 429,
      code: "limited",
      outcome: "denied",
      retryAfterSeconds: 45,
    });

    const response = await call({ roles: ["local_steward"], mfaCode: "123456" });
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    expect(body.code).toBe("mfa_step_up_limited");
    expect(setUserRolesMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
      }),
    );
  });

  it("audits the successful role change with the same server request ID", async () => {
    const response = await call({ roles: ["local_steward"], mfaCode: "123456" });

    expect(response.status).toBe(200);
    expect(freshMfaStepUpMock).toHaveBeenCalledWith({
      userId: "platform-admin-1",
      code: "123456",
    });
    expect(setUserRolesMock).toHaveBeenCalledWith({
      actorUserId: "platform-admin-1",
      targetUserId: "target-user",
      roles: ["local_steward"],
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "site_admin.user.set_roles",
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
      }),
    );
    expect(JSON.stringify(auditLogMock.mock.calls)).not.toContain("123456");
  });

  it("fails closed when the hosted customer profile has no TOTP mode", async () => {
    freshMfaStepUpMock.mockResolvedValue({
      ok: false,
      status: 503,
      code: "unavailable",
      outcome: "error",
    });

    const response = await call({ roles: ["local_steward"], mfaCode: "123456" });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("mfa_step_up_unavailable");
    expect(freshMfaStepUpMock).toHaveBeenCalled();
    expect(setUserRolesMock).not.toHaveBeenCalled();
    expect(auditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "error", requestId: response.headers.get("X-Request-ID") }),
    );
  });
});
