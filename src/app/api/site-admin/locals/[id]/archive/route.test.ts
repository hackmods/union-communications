import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLog: vi.fn(),
  freshMfaStepUp: vi.fn(),
  getDb: vi.fn(),
  requireSiteAdminSession: vi.fn(),
  reportApiFailure: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((column, value) => ({ column, value })),
}));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/db/schema/tenant", () => ({
  locals: {
    id: "locals.id",
    archivedAt: "locals.archivedAt",
    archivedById: "locals.archivedById",
    unionId: "locals.unionId",
  },
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

import { POST as archiveLocal } from "@/app/api/site-admin/locals/[id]/archive/route";
import { POST as restoreLocal } from "@/app/api/site-admin/locals/[id]/restore/route";

const actor = { user: { id: "operator-1", roles: ["platform_admin"] } };
const local = {
  id: "local-1",
  unionId: "union-1",
};

const routeCases = [
  {
    action: "archive",
    handler: archiveLocal,
    auditAction: "site_admin.local.archive",
    phase: "archive_result",
  },
  {
    action: "restore",
    handler: restoreLocal,
    auditAction: "site_admin.local.restore",
    phase: "restore_result",
  },
];

function request(body: Record<string, unknown> = {}) {
  return new Request("https://unionops.test/api/site-admin/locals/local-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params() {
  return { params: Promise.resolve({ id: local.id }) };
}

function configureDb(rows: unknown[] = [local]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const selectWhere = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from }));
  const updateWhere = vi.fn().mockResolvedValue([]);
  const set = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set }));
  mocks.getDb.mockReturnValue({ select, update });
  return { select, update, set, updateWhere, limit };
}

describe.each(routeCases)("POST local $action", ({ action, handler, auditAction, phase }) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSiteAdminSession.mockResolvedValue({ ok: true, session: actor });
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

  it("requires fresh MFA before reading the local", async () => {
    const response = await handler(request(), params());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).toBeTruthy();
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: actor.user.id,
        action: auditAction,
        resourceId: local.id,
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { reason: "mfa_step_up_required" },
      }),
    );
  });

  it("does not mutate when the pre-action audit cannot be confirmed", async () => {
    const db = configureDb();
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));

    const response = await handler(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("audits and applies the action without recording the MFA code", async () => {
    const db = configureDb();
    const response = await handler(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(db.update).toHaveBeenCalledOnce();
    expect(mocks.auditLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        userId: actor.user.id,
        action: auditAction,
        resourceId: local.id,
        unionId: local.unionId,
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { phase, localId: local.id },
      }),
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
  });

  it("warns when the mutation may have succeeded but its result audit failed", async () => {
    const db = configureDb();
    mocks.auditLog
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("audit backend unavailable"));

    const response = await handler(request({ mfaCode: "654321" }), params());
    const body = await response.json();

    expect(db.update).toHaveBeenCalledOnce();
    expect(response.status).toBe(503);
    expect(body.code).toBe("local_action_audit_unavailable");
    expect(body.error).toContain("Check its status before retrying");
  });

  it("treats a database error after mutation begins as an unconfirmed result", async () => {
    const db = configureDb();
    db.updateWhere.mockRejectedValue(new Error("connection lost during write"));
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await handler(request({ mfaCode: "654321" }), params());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("local_action_outcome_unconfirmed");
    expect(body.error).toContain("Check its status before retrying");
  });
});
