import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLog: vi.fn(),
  freshMfaStepUp: vi.fn(),
  getDb: vi.fn(),
  isPostgresConfigured: vi.fn(),
  requireSiteAdminSession: vi.fn(),
  reportApiFailure: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((column, value) => ({ column, value })),
  sql: vi.fn((strings, ...values) => ({ strings, values })),
}));
vi.mock("@/lib/db/client", () => ({
  getDb: mocks.getDb,
  isPostgresConfigured: mocks.isPostgresConfigured,
}));
vi.mock("@/lib/db/schema/tenant", () => ({
  unions: { id: "unions.id" },
}));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: mocks.requireSiteAdminSession,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: mocks.reportApiFailure,
}));

import { PATCH } from "@/app/api/site-admin/unions/[id]/route";

const actor = { user: { id: "operator-1", roles: ["platform_admin"] } };
const union = { id: "union-1" };

function request(body: Record<string, unknown> = { membershipPolicy: "single_local" }) {
  return new Request("https://unionops.test/api/site-admin/unions/union-1", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "client-controlled",
    },
    body: JSON.stringify(body),
  });
}

function params() {
  return { params: Promise.resolve({ id: union.id }) };
}

function configureDb(rows: unknown[] = [union]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  const execute = vi.fn().mockResolvedValue([{ n: 2 }]);
  const updateWhere = vi.fn().mockResolvedValue([]);
  const set = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set }));
  mocks.getDb.mockReturnValue({ select, execute, update });
  return { select, execute, update, set, updateWhere, limit };
}

describe("PATCH /api/site-admin/unions/[id] membership policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSiteAdminSession.mockResolvedValue({ ok: true, session: actor });
    mocks.isPostgresConfigured.mockReturnValue(true);
    configureDb();
    mocks.auditLog.mockResolvedValue({});
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
  });

  it("requires fresh MFA after validation and before reading union data", async () => {
    const response = await PATCH(request(), params());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: actor.user.id,
        action: "site_admin.union.membership_policy",
        unionId: union.id,
        outcome: "denied",
        metadata: { reason: "mfa_step_up_required" },
      }),
    );
  });

  it("rejects extra request fields before MFA verification", async () => {
    const response = await PATCH(
      request({ membershipPolicy: "single_local", hidden: true }),
      params(),
    );

    expect(response.status).toBe(400);
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("requires the authorization audit before aggregate reads and policy writes", async () => {
    const db = configureDb();
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await PATCH(
      request({ membershipPolicy: "single_local", mfaCode: "654321" }),
      params(),
    );

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(db.execute).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("updates the union, returns the impact count, and audits without the code", async () => {
    const db = configureDb();
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await PATCH(
      request({ membershipPolicy: "single_local", mfaCode: "654321" }),
      params(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      membershipPolicy: "single_local",
      multiLocalMemberCount: 2,
    });
    expect(db.execute).toHaveBeenCalledOnce();
    expect(db.update).toHaveBeenCalledOnce();
    expect(mocks.auditLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLog.mock.invocationCallOrder[0]).toBeLessThan(
      db.update.mock.invocationCallOrder[0],
    );
    expect(mocks.auditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: "site_admin.union.membership_policy",
        resourceId: union.id,
        unionId: union.id,
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: {
          phase: "update_result",
          membershipPolicy: "single_local",
        },
      }),
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
  });

  it("warns when the policy changed but its result audit failed", async () => {
    const db = configureDb();
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("audit backend unavailable"));

    const response = await PATCH(
      request({ membershipPolicy: "multi_local", mfaCode: "654321" }),
      params(),
    );
    const body = await response.json();

    expect(db.execute).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledOnce();
    expect(response.status).toBe(503);
    expect(body.code).toBe("union_update_result_unconfirmed");
    expect(body.error).toContain("Check the union settings before retrying");
  });

  it("treats a database error during the write as an uncertain result", async () => {
    const db = configureDb();
    db.updateWhere.mockRejectedValue(new Error("connection lost during write"));
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await PATCH(
      request({ membershipPolicy: "multi_local", mfaCode: "654321" }),
      params(),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("union_update_result_unconfirmed");
    expect(body.error).toContain("Check the union settings before retrying");
  });
});
