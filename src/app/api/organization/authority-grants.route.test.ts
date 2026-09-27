import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLog: vi.fn(),
  auth: vi.fn(),
  decideCapability: vi.fn(),
  freshMfaStepUp: vi.fn(),
  getDb: vi.fn(),
  isCrossLocalAdministrator: vi.fn(),
  isPostgresConfigured: vi.fn(),
  resolveAuthorizationActor: vi.fn(),
  withRlsContext: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/authorization/model", () => ({
  decideCapability: mocks.decideCapability,
  isCrossLocalAdministrator: mocks.isCrossLocalAdministrator,
}));
vi.mock("@/lib/authorization/resolve-actor", () => ({
  resolveAuthorizationActor: mocks.resolveAuthorizationActor,
}));
vi.mock("@/lib/db/client", () => ({
  getDb: mocks.getDb,
  isPostgresConfigured: mocks.isPostgresConfigured,
}));
vi.mock("@/lib/db/rls-context", () => ({
  withRlsContext: mocks.withRlsContext,
}));

import { POST as createOfficerAssignment } from "@/app/api/organization/officers/route";
import { POST as createDelegation } from "@/app/api/organization/delegations/route";
import { DELETE as deleteOfficerAssignment } from "@/app/api/organization/officers/[id]/route";
import { DELETE as deleteDelegation } from "@/app/api/organization/delegations/[id]/route";

const actor = {
  accountActive: true,
  unionId: "union-1",
  userId: "grantor-1",
};

function createDb(selectResults: unknown[][] = [], outerSelectResults?: unknown[][]) {
  const queuedResults = [...selectResults];
  const queuedOuterResults = outerSelectResults ? [...outerSelectResults] : undefined;
  const tx = {
    select: vi.fn(() => {
      const result = queuedResults.shift() ?? [];
      return {
        from: () => ({ where: () => ({ limit: async () => result }) }),
      };
    }),
    insert: vi.fn(() => ({
      values: () => ({
        returning: async () => [{
          id: "grant-1",
          position: "steward",
          capability: "grievances.case.read",
          startsAt: new Date("2026-09-27T12:00:00.000Z"),
          endsAt: new Date("2026-09-28T12:00:00.000Z"),
        }],
      }),
    })),
    update: vi.fn(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ id: "grant-1", revokedAt: new Date("2026-09-27T12:00:00.000Z") }],
        }),
      }),
    })),
    execute: vi.fn(async () => undefined),
  };
  const db = {
    select: vi.fn(() => {
      const result = queuedOuterResults
        ? queuedOuterResults.shift() ?? []
        : [{ id: "local-1" }];
      return { from: () => ({ where: () => ({ limit: async () => result }) }) };
    }),
    transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
  };
  return { db, tx };
}

function request(path: string, body: unknown, method: "POST" | "DELETE" = "POST") {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", "X-Request-ID": "client-controlled" },
    body: JSON.stringify(body),
  });
}

const revokeOfficerAssignment = (request: Request) =>
  deleteOfficerAssignment(request, { params: Promise.resolve({ id: "grant-1" }) });
const revokeDelegation = (request: Request) =>
  deleteDelegation(request, { params: Promise.resolve({ id: "grant-1" }) });

describe("organization authority grant MFA boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "grantor-1", unionId: "union-1", localId: "local-1" } });
    mocks.decideCapability.mockReturnValue({ allowed: true });
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(code
        ? { ok: true, required: true }
        : { ok: false, status: 428, code: "required", outcome: "denied" }),
    );
    mocks.isCrossLocalAdministrator.mockReturnValue(false);
    mocks.isPostgresConfigured.mockReturnValue(true);
    mocks.resolveAuthorizationActor.mockResolvedValue(actor);
    mocks.withRlsContext.mockImplementation(async (_context: unknown, callback: () => unknown) => callback());
    mocks.auditLog.mockResolvedValue({});
  });

  it("blocks direct officer-assignment API calls before opening a write transaction", async () => {
    const { db } = createDb();
    mocks.getDb.mockReturnValue(db);

    const response = await createOfficerAssignment(request("/api/organization/officers", {
      localId: "local-1",
      userId: "member-1",
      position: "steward",
      startsAt: "2026-09-27T12:00:00.000Z",
    }));
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.freshMfaStepUp).toHaveBeenCalledWith({ userId: "grantor-1", code: undefined });
    expect(db.transaction).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "officer.assignment.create",
      outcome: "denied",
      requestId: response.headers.get("X-Request-ID"),
      metadata: { reason: "mfa_step_up_required" },
    }));
  });

  it("blocks direct delegation API calls before opening a write transaction", async () => {
    const { db } = createDb();
    mocks.getDb.mockReturnValue(db);

    const response = await createDelegation(request("/api/organization/delegations", {
      localId: "local-1",
      delegateUserId: "member-1",
      capability: "grievances.case.read",
      startsAt: "2026-09-27T12:00:00.000Z",
      endsAt: "2026-09-28T12:00:00.000Z",
      reason: "Temporary case coverage",
    }));
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.freshMfaStepUp).toHaveBeenCalledWith({ userId: "grantor-1", code: undefined });
    expect(db.transaction).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "delegation.create",
      outcome: "denied",
      requestId: response.headers.get("X-Request-ID"),
      metadata: { reason: "mfa_step_up_required" },
    }));
  });

  it("honors the shared attempt limit before creating a delegation", async () => {
    const { db } = createDb();
    mocks.getDb.mockReturnValue(db);
    mocks.freshMfaStepUp.mockResolvedValue({
      ok: false,
      status: 429,
      code: "limited",
      outcome: "denied",
      retryAfterSeconds: 45,
    });

    const response = await createDelegation(request("/api/organization/delegations", {
      localId: "local-1",
      delegateUserId: "member-1",
      capability: "grievances.case.read",
      startsAt: "2026-09-27T12:00:00.000Z",
      endsAt: "2026-09-28T12:00:00.000Z",
      reason: "Temporary case coverage",
      mfaCode: "123456",
    }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    expect(body.code).toBe("mfa_step_up_limited");
    expect(db.transaction).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "denied",
      requestId: response.headers.get("X-Request-ID"),
      metadata: { reason: "mfa_step_up_limited" },
    }));
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("123456");
  });

  it.each([
    ["officer assignment", revokeOfficerAssignment, "/api/organization/officers/grant-1", "officer.assignment.revoke"],
    ["delegation", revokeDelegation, "/api/organization/delegations/grant-1", "delegation.revoke"],
  ] as const)("requires a fresh challenge before revoking a %s", async (_name, route, path, action) => {
    const resource = {
      id: "grant-1",
      unionId: "union-1",
      localId: "local-1",
      userId: "member-1",
      delegateUserId: "member-1",
      revokedAt: null,
    };
    const outerResults = path.includes("officers")
      ? [[resource], [{ id: "local-1" }]]
      : [[{ id: "local-1" }], [resource]];
    const { db } = createDb([], outerResults);
    mocks.getDb.mockReturnValue(db);

    const response = await route(request(path, { localId: "local-1" }, "DELETE"));
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(db.transaction).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action,
      outcome: "denied",
      requestId: response.headers.get("X-Request-ID"),
      metadata: { reason: "mfa_step_up_required" },
    }));
  });

  it.each([
    ["officer assignment", createOfficerAssignment, "/api/organization/officers", {
      localId: "local-1", userId: "member-1", position: "steward", startsAt: "2026-09-27T12:00:00.000Z",
    }],
    ["delegation", createDelegation, "/api/organization/delegations", {
      localId: "local-1", delegateUserId: "member-1", capability: "grievances.case.read",
      startsAt: "2026-09-27T12:00:00.000Z", endsAt: "2026-09-28T12:00:00.000Z", reason: "Temporary case coverage",
    }],
    ["officer assignment revocation", revokeOfficerAssignment, "/api/organization/officers/grant-1", { localId: "local-1" }],
    ["delegation revocation", revokeDelegation, "/api/organization/delegations/grant-1", { localId: "local-1" }],
  ] as const)("correlates the successful %s change and never audits the MFA code", async (_name, route, path, body) => {
    const isRevoke = path.includes("/grant-1");
    const isOfficer = path.includes("officers");
    const txSelects = isRevoke
      ? []
      : isOfficer
        ? [[{ id: "membership-1" }], [{ id: "member-1", unionId: "union-1" }]]
        : [[{ id: "member-1", unionId: "union-1", archivedAt: null, lockedAt: null }], [{ id: "membership-1" }]];
    const resource = {
      id: "grant-1", unionId: "union-1", localId: "local-1", userId: "member-1",
      delegateUserId: "member-1", revokedAt: null,
    };
    const outerResults = isRevoke
      ? isOfficer
        ? [[resource], [{ id: "local-1" }]]
        : [[{ id: "local-1" }], [resource]]
      : undefined;
    const { db } = createDb(txSelects, outerResults);
    mocks.getDb.mockReturnValue(db);

    const response = await route(request(path, { ...body, mfaCode: "123456" }, isRevoke ? "DELETE" : "POST"));

    expect(response.status).toBe(isRevoke ? 200 : 201);
    expect(mocks.freshMfaStepUp).toHaveBeenCalledWith({ userId: "grantor-1", code: "123456" });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "success",
      requestId: response.headers.get("X-Request-ID"),
    }));
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("123456");
  });
});
