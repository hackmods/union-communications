import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assignUserLocal: vi.fn(),
  auditLog: vi.fn(),
  freshMfaStepUp: vi.fn(),
  isPostgresConfigured: vi.fn(),
  reportApiFailure: vi.fn(),
  requireSiteAdminSession: vi.fn(),
}));

vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: mocks.requireSiteAdminSession,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/db/client", () => ({
  isPostgresConfigured: mocks.isPostgresConfigured,
}));
vi.mock("@/lib/tenant/assign-local", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tenant/assign-local")>();
  return {
    ...actual,
    assignUserLocal: mocks.assignUserLocal,
  };
});
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: mocks.reportApiFailure,
}));

import { POST } from "@/app/api/site-admin/users/[id]/assign-local/route";

const session = {
  user: { id: "operator-1", unionId: undefined, localId: undefined },
};
const assigned = {
  ok: true as const,
  unionId: "union-1",
  localId: "local-7",
  membershipId: "membership-1",
  membershipPolicy: "multi_local" as const,
  createdLocal: false,
  createdUnion: false,
  replacedMembershipIds: [],
};

function params(id = "member-1") {
  return { params: Promise.resolve({ id }) };
}

function request(body: Record<string, unknown> = {}) {
  return new Request("https://unionops.test/api/site-admin/users/member-1/assign-local", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "client-controlled",
    },
    body: JSON.stringify({ unionId: "union-1", localId: "local-7", ...body }),
  });
}

describe("POST /api/site-admin/users/[id]/assign-local", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSiteAdminSession.mockResolvedValue({ ok: true, session });
    mocks.isPostgresConfigured.mockReturnValue(true);
    mocks.auditLog.mockResolvedValue({});
    mocks.assignUserLocal.mockResolvedValue(assigned);
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
  });

  it("requires fresh MFA before the membership adapter is called", async () => {
    const response = await POST(request(), params());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.assignUserLocal).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: session.user.id,
        action: "site_admin.user.assign_local",
        resourceType: "site_admin",
        resourceId: "member-1",
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { reason: "mfa_step_up_required" },
      }),
    );
  });

  it("honors MFA attempt throttling before the membership adapter", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({
      ok: false,
      status: 429,
      code: "limited",
      outcome: "denied",
      retryAfterSeconds: 120,
    });
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect((await response.json()).code).toBe("mfa_step_up_limited");
    expect(mocks.assignUserLocal).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
  });

  it("requires a correlated authorization audit before the assignment write", async () => {
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(200);
    expect(mocks.assignUserLocal).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: session.user.id,
        targetUserId: "member-1",
        unionId: "union-1",
        localId: "local-7",
      }),
    );
    const authorization = mocks.auditLog.mock.calls.find(
      ([entry]) => entry.metadata?.phase === "assignment_authorized",
    );
    expect(authorization).toBeDefined();
    expect(authorization?.[0].requestId).toBe(response.headers.get("X-Request-ID"));
    expect(
      mocks.auditLog.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.assignUserLocal.mock.invocationCallOrder[0]);
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        unionId: assigned.unionId,
        localId: assigned.localId,
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: expect.objectContaining({
          phase: "assignment_result",
          membershipId: assigned.membershipId,
        }),
      }),
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
  });

  it("does not apply the change if its authorization audit cannot be confirmed", async () => {
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(mocks.assignUserLocal).not.toHaveBeenCalled();
  });

  it("returns a visible conflict and records no completed assignment", async () => {
    mocks.assignUserLocal.mockResolvedValue({
      ok: false,
      status: 409,
      code: "single_local_conflict",
      error: "Replace required",
      conflictingLocalIds: ["local-old"],
    });
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("single_local_conflict");
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "denied",
        metadata: {
          phase: "assignment_result",
          reason: "single_local_conflict",
        },
      }),
    );
  });

  it("warns instead of inviting blind retry when the write result audit fails", async () => {
    mocks.auditLog.mockResolvedValueOnce({}).mockRejectedValueOnce(
      new Error("audit backend unavailable"),
    );
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(mocks.assignUserLocal).toHaveBeenCalledOnce();
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("assignment_audit_unavailable");
  });

  it("maps known Postgres membership authority throws to a coded denial", async () => {
    mocks.assignUserLocal.mockRejectedValue(
      new Error("membership management authority required"),
    );
    const response = await POST(request({ mfaCode: "654321" }), params());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("membership_authority_denied");
    expect(mocks.reportApiFailure).toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "denied",
        metadata: {
          phase: "assignment_result",
          reason: "membership_authority_denied",
        },
      }),
    );
  });

  it("keeps unexpected adapter failures opaque with assignment_failed", async () => {
    mocks.assignUserLocal.mockRejectedValue(new Error("ECONNRESET"));
    const response = await POST(request({ mfaCode: "654321" }), params());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Assign local failed",
      code: "assignment_failed",
    });
  });
});
