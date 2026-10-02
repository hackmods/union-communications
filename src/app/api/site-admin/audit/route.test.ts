import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLogLog: vi.fn(),
  auditLogQuery: vi.fn(),
  auditDbBackend: vi.fn(),
  freshMfaStepUp: vi.fn(),
  getDb: vi.fn(),
  getOwnerDb: vi.fn(),
  isOwnerDbConfigured: vi.fn(),
  requireSiteAdminSession: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions) => conditions),
  desc: vi.fn((column) => column),
  eq: vi.fn((column, value) => ({ column, value })),
  gte: vi.fn((column, value) => ({ column, value, op: "gte" })),
  lte: vi.fn((column, value) => ({ column, value, op: "lte" })),
  ilike: vi.fn((column, value) => ({ column, value, op: "ilike" })),
}));
vi.mock("@/lib/audit/store", () => ({
  auditLog: { log: mocks.auditLogLog, query: mocks.auditLogQuery },
}));
vi.mock("@/lib/db/backend", () => ({ auditDbBackend: mocks.auditDbBackend }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/db/owner-client", () => ({
  getOwnerDb: mocks.getOwnerDb,
  isOwnerDbConfigured: mocks.isOwnerDbConfigured,
}));
vi.mock("@/lib/db/schema", () => ({ auditLog: { resourceType: "audit.resourceType", timestamp: "audit.timestamp" } }));
vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: mocks.requireSiteAdminSession,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));

import { GET, POST } from "@/app/api/site-admin/audit/route";

const actor = { user: { id: "operator-1", roles: ["platform_admin"] } };
const auditEntry = {
  id: "event-1",
  userId: "operator-2",
  action: "site_admin.user.set_roles",
  resourceType: "site_admin",
  resourceId: "member-1",
  unionId: "union-1",
  timestamp: "2026-09-27T12:00:00.000Z",
  outcome: "success" as const,
  requestId: "server-request-1",
  metadata: { phase: "result" },
};

function request(body: Record<string, unknown> = { limit: 100 }) {
  return new Request("https://unionops.test/api/site-admin/audit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "client-controlled",
    },
    body: JSON.stringify(body),
  });
}

describe("Site Admin cross-tenant audit log access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSiteAdminSession.mockResolvedValue({ ok: true, session: actor });
    mocks.auditDbBackend.mockReturnValue("memory");
    mocks.isOwnerDbConfigured.mockReturnValue(false);
    mocks.auditLogQuery.mockResolvedValue([auditEntry]);
    mocks.auditLogLog.mockResolvedValue({});
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
  });

  it("requires fresh MFA before querying cross-tenant audit rows", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.auditLogQuery).not.toHaveBeenCalled();
    expect(mocks.auditLogLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: actor.user.id,
        action: "site_admin.audit.list",
        resourceId: "*",
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { phase: "access_challenge", reason: "mfa_step_up_required" },
      }),
    );
  });

  it("rejects unrecognized fields before checking MFA", async () => {
    const response = await POST(request({ limit: 10, query: "secret" }));

    expect(response.status).toBe(400);
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.auditLogQuery).not.toHaveBeenCalled();
  });

  it("requires access-intent audit before querying rows", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLogLog.mockRejectedValue(new Error("audit backend unavailable"));

    const response = await POST(request({ limit: 25, mfaCode: "654321" }));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(mocks.auditLogQuery).not.toHaveBeenCalled();
  });

  it("returns entries only after correlated access and result events append", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await POST(request({ limit: 25, mfaCode: "654321" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entries).toEqual([auditEntry]);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.auditLogQuery).toHaveBeenCalledWith({
      resourceType: "site_admin",
      limit: 25,
    });
    expect(mocks.auditLogLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLogLog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        userId: actor.user.id,
        action: "site_admin.audit.list",
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: {
          phase: "read_result",
          limit: "25",
          count: "1",
          ownerRead: "false",
          filtered: "false",
        },
      }),
    );
    expect(JSON.stringify(mocks.auditLogLog.mock.calls)).not.toContain("654321");
  });

  it("filters memory-backed rows by actor without copying the MFA code into audit metadata", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLogQuery.mockResolvedValue([
      auditEntry,
      { ...auditEntry, id: "event-2", userId: "other-operator" },
    ]);

    const response = await POST(
      request({ limit: 25, mfaCode: "654321", actor: "operator-2" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.entries).toEqual([auditEntry]);
    expect(mocks.auditLogQuery).toHaveBeenCalledWith({
      resourceType: "site_admin",
      limit: 100,
    });
    expect(mocks.auditLogLog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          filtered: "true",
          count: "1",
        }),
      }),
    );
    expect(JSON.stringify(mocks.auditLogLog.mock.calls)).not.toContain("654321");
  });

  it("withholds rows if the result access event cannot be confirmed", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLogLog
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("audit backend unavailable"));

    const response = await POST(request({ mfaCode: "654321" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("audit_read_result_unconfirmed");
    expect(JSON.stringify(body)).not.toContain("event-1");
  });

  it("retires the unauthenticated query-string GET access path", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(mocks.auditLogQuery).not.toHaveBeenCalled();
  });
});
