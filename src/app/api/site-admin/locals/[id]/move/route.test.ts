import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLog: vi.fn(),
  freshMfaStepUp: vi.fn(),
  requireSiteAdminSession: vi.fn(),
  reportApiFailure: vi.fn(),
  isPostgresConfigured: vi.fn(() => true),
  isOwnerDbConfigured: vi.fn(() => true),
  previewLocalMove: vi.fn(),
  executeLocalMove: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  isPostgresConfigured: mocks.isPostgresConfigured,
}));
vi.mock("@/lib/db/owner-client", () => ({
  isOwnerDbConfigured: mocks.isOwnerDbConfigured,
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
vi.mock("@/lib/site-admin/local-move", () => ({
  previewLocalMove: mocks.previewLocalMove,
  executeLocalMove: mocks.executeLocalMove,
}));

import { POST as previewMove } from "@/app/api/site-admin/locals/[id]/move/preview/route";
import { POST as commitMove } from "@/app/api/site-admin/locals/[id]/move/route";

const actor = { user: { id: "operator-1", roles: ["platform_admin"] } };

function params() {
  return { params: Promise.resolve({ id: "local-1" }) };
}

function request(body: Record<string, unknown>) {
  return new Request("https://unionops.test/api/site-admin/locals/local-1/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/site-admin/locals/[id]/move/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSiteAdminSession.mockResolvedValue({
      ok: true,
      session: actor,
    });
    mocks.isPostgresConfigured.mockReturnValue(true);
    mocks.isOwnerDbConfigured.mockReturnValue(true);
    mocks.auditLog.mockResolvedValue({});
    mocks.previewLocalMove.mockResolvedValue({
      ok: true,
      data: {
        localId: "local-1",
        fromUnionId: "union-a",
        toUnionId: "union-b",
        localNumber: "7",
        effectiveLocalNumber: "7",
        fromUnionName: "A",
        toUnionName: "B",
        fromIsDemo: false,
        toIsDemo: false,
        fromMembershipPolicy: "multi_local",
        toMembershipPolicy: "multi_local",
        counts: {
          usersPrimary: 0,
          memberships: 0,
          invites: 0,
          bargainingUnits: 0,
          caseworkRows: 0,
          portalCircles: 0,
          tablesWithRows: 0,
        },
        blocks: [],
        warnings: [],
        conflictingUserIds: [],
        canMove: true,
      },
    });
  });

  it("returns preview without MFA", async () => {
    const response = await previewMove(
      request({ toUnionId: "union-b" }),
      params(),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.preview.canMove).toBe(true);
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.previewLocalMove).toHaveBeenCalledWith(
      expect.objectContaining({ localId: "local-1", toUnionId: "union-b" }),
    );
  });

  it("fails closed without owner DB", async () => {
    mocks.isOwnerDbConfigured.mockReturnValue(false);
    const response = await previewMove(
      request({ toUnionId: "union-b" }),
      params(),
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("owner_db_required");
  });
});

describe("POST /api/site-admin/locals/[id]/move", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSiteAdminSession.mockResolvedValue({
      ok: true,
      session: actor,
    });
    mocks.isPostgresConfigured.mockReturnValue(true);
    mocks.isOwnerDbConfigured.mockReturnValue(true);
    mocks.auditLog.mockResolvedValue({});
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
    mocks.executeLocalMove.mockResolvedValue({
      ok: true,
      data: {
        localId: "local-1",
        fromUnionId: "union-a",
        toUnionId: "union-b",
        localNumber: "7",
        divisionId: null,
        tablesTouched: 3,
        usersBumped: 1,
        invitesRewritten: 0,
        caseworkRows: 0,
        membershipsEnded: 0,
      },
    });
  });

  it("requires fresh MFA before commit", async () => {
    const response = await commitMove(
      request({
        toUnionId: "union-b",
        confirmLocalNumber: "7",
        acknowledgeWarnings: true,
      }),
      params(),
    );
    expect(response.status).toBe(428);
    expect(mocks.executeLocalMove).not.toHaveBeenCalled();
  });

  it("commits move after MFA and dual-phase audit", async () => {
    const response = await commitMove(
      request({
        toUnionId: "union-b",
        confirmLocalNumber: "7",
        acknowledgeWarnings: true,
        mfaCode: "123456",
      }),
      params(),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.move.toUnionId).toBe("union-b");
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "site_admin.local.move",
        metadata: expect.objectContaining({ phase: "move_authorized" }),
      }),
    );
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "site_admin.local.move",
        metadata: expect.objectContaining({ phase: "move_result" }),
      }),
    );
  });

  it("returns unconfirmed when result audit fails after mutation", async () => {
    mocks.auditLog
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("audit down"));
    const response = await commitMove(
      request({
        toUnionId: "union-b",
        confirmLocalNumber: "7",
        acknowledgeWarnings: true,
        mfaCode: "123456",
      }),
      params(),
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("local_move_result_unconfirmed");
  });
});
