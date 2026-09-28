import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  auditLog: vi.fn(),
  auditDbBackend: vi.fn(),
  freshMfaStepUp: vi.fn(),
  getDb: vi.fn(),
  hostedCustomerMode: vi.fn(),
  rows: {} as Record<string, unknown[]>,
  deleted: [] as string[],
  inserted: [] as Array<{ table: string; value: Record<string, unknown> }>,
  withRlsContext: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((column, value) => ({ column, value })),
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/audit/request-correlation", () => ({
  createAuditRequestContext: () => ({
    requestId: "request-test-1",
    responseHeaders: (headers?: HeadersInit) => {
      const result = new Headers(headers);
      result.set("X-Request-ID", "request-test-1");
      return result;
    },
  }),
}));
vi.mock("@/lib/auth/mfa-policy", () => ({
  isHostedCustomerMode: mocks.hostedCustomerMode,
}));
vi.mock("@/lib/db/backend", () => ({ auditDbBackend: mocks.auditDbBackend }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/db/rls-context", () => ({
  withRlsContext: mocks.withRlsContext,
}));
vi.mock("@/lib/db/schema", () => ({
  subprocessorRegistry: { id: "registry.id" },
  subprocessorPublicProjections: { id: "projection.id" },
  subprocessorAuditEvents: { id: "subprocessorEvents.id" },
}));
vi.mock("@/lib/site-admin/subprocessor-http", () => ({
  authorizeSubprocessorAdmin: mocks.authorize,
}));

import { POST } from "@/app/api/site-admin/subprocessors/[id]/publish/route";

const access = {
  ok: true,
  actorId: "operator-1",
  rlsContext: { userId: "operator-1", mfaVerified: true },
};

const approvedRecord = {
  id: "provider-1",
  serviceName: "Verified hosting",
  purpose: { en: "Hosting", fr: "Hébergement" },
  dataCategories: { en: ["Account data"], fr: ["Données de compte"] },
  dataSubjects: { en: ["Users"], fr: ["Personnes utilisatrices"] },
  processingRegion: "Canada",
  transferStatus: "within_canada",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null,
  publicNotes: { en: "Approved note", fr: "Note approuvée" },
  reviewStatus: "approved",
  publicDisclosureApproved: true,
  reviewedBy: "operator-2",
  createdBy: "operator-1",
  updatedBy: "operator-1",
  internalNotes: "restricted reviewer note",
  verificationEvidence: "internal evidence reference",
};

function request(body: unknown) {
  return new Request("https://unionops.test/api/site-admin/subprocessors/provider-1/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id = "provider-1") {
  return { params: Promise.resolve({ id }) };
}

function configureDb(
  registryRows: unknown[] = [approvedRecord],
  projectionRows: unknown[] = [],
) {
  mocks.rows = {
    "registry.id": registryRows,
    "projection.id": projectionRows,
  };
  const db = {
    select: vi.fn(() => ({
      from: (table: { id: string }) => ({
        where: () => ({
          limit: () => ({
            for: async () => mocks.rows[table.id] ?? [],
          }),
        }),
      }),
    })),
    delete: vi.fn((table: { id: string }) => ({
      where: async () => { mocks.deleted.push(table.id); },
    })),
    insert: vi.fn((table: { id: string }) => ({
      values: async (value: Record<string, unknown>) => {
        mocks.inserted.push({ table: table.id, value });
      },
    })),
  };
  mocks.getDb.mockReturnValue(db);
  return db;
}

describe("POST /api/site-admin/subprocessors/[id]/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleted = [];
    mocks.inserted = [];
    mocks.authorize.mockResolvedValue(access);
    mocks.hostedCustomerMode.mockReturnValue(false);
    mocks.auditDbBackend.mockReturnValue("memory");
    mocks.auditLog.mockResolvedValue({});
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(code
        ? { ok: true, required: true }
        : { ok: false, status: 428, code: "required", outcome: "denied" }),
    );
    mocks.withRlsContext.mockImplementation((_context, callback) => callback());
    configureDb();
  });

  it("requires fresh MFA before querying provider or public projection data", async () => {
    const response = await POST(request({ published: true }), context());

    expect(response.status).toBe(428);
    expect((await response.json()).code).toBe("mfa_step_up_required");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Request-ID")).toBe("request-test-1");
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.withRlsContext).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "site_admin.subprocessor.publish",
      outcome: "denied",
      requestId: "request-test-1",
      metadata: { phase: "step_up", reason: "mfa_step_up_required", published: "true" },
    }));
  });

  it("keeps denied MFA codes out of audit metadata and never opens the registry query", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({
      ok: false,
      status: 400,
      code: "failed",
      outcome: "denied",
    });

    const response = await POST(request({ published: true, mfaCode: "654321" }), context());

    expect(response.status).toBe(400);
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "denied",
      metadata: { phase: "step_up", reason: "mfa_step_up_failed", published: "true" },
    }));
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
  });

  it("rejects unknown request fields before challenge or database access", async () => {
    const response = await POST(request({ published: true, skipReview: true }), context());

    expect(response.status).toBe(400);
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("requires durable audit storage for the hosted customer publication path", async () => {
    mocks.hostedCustomerMode.mockReturnValue(true);

    const response = await POST(request({ published: true }), context());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("does not query or mutate when the access-intent audit is unavailable", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));

    const response = await POST(request({ published: true, mfaCode: "654321" }), context());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.withRlsContext).not.toHaveBeenCalled();
  });

  it("publishes only the allow-listed projection and correlates the result audit", async () => {
    const db = configureDb();
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await POST(request({ published: true, mfaCode: "654321" }), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, published: true });
    expect(mocks.withRlsContext).toHaveBeenCalledWith(access.rlsContext, expect.any(Function));
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(mocks.deleted).toEqual(["projection.id"]);
    expect(mocks.inserted).toHaveLength(2);
    expect(mocks.inserted[0].table).toBe("projection.id");
    expect(mocks.inserted[1].table).toBe("subprocessorEvents.id");
    expect(JSON.stringify(mocks.inserted[0].value)).not.toContain("internalNotes");
    expect(JSON.stringify(mocks.inserted[0].value)).not.toContain("verificationEvidence");
    expect(mocks.auditLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLog).toHaveBeenLastCalledWith(expect.objectContaining({
      userId: access.actorId,
      action: "site_admin.subprocessor.publish",
      resourceId: "provider-1",
      outcome: "success",
      requestId: "request-test-1",
      metadata: { phase: "publication_result", published: "true" },
    }));
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
  });

  it("withdraws the public projection and records the safe before image", async () => {
    configureDb([approvedRecord], [{ id: "provider-1", serviceName: "Previously public" }]);
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await POST(request({ published: false, mfaCode: "654321" }), context());

    expect(response.status).toBe(200);
    expect(mocks.deleted).toEqual(["projection.id"]);
    expect(mocks.inserted).toHaveLength(1);
    expect(mocks.inserted[0].value.action).toBe("withdrawn");
    expect(mocks.inserted[0].value.beforeRecord).toEqual({ id: "provider-1", serviceName: "Previously public" });
    expect(mocks.inserted[0].value.afterRecord).toBeNull();
  });

  it("does not publish a record without a valid second-person review", async () => {
    configureDb([{ ...approvedRecord, reviewedBy: "operator-1" }]);
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await POST(request({ published: true, mfaCode: "654321" }), context());

    expect(response.status).toBe(409);
    expect(mocks.deleted).toHaveLength(0);
    expect(mocks.inserted).toHaveLength(0);
    expect(mocks.auditLog).toHaveBeenLastCalledWith(expect.objectContaining({
      outcome: "denied",
      metadata: { phase: "publication_result", reason: "provider_not_publishable" },
    }));
  });

  it("withholds success when the post-transaction result audit fails", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("audit backend unavailable"));

    const response = await POST(request({ published: true, mfaCode: "654321" }), context());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("subprocessor_publish_result_unconfirmed");
    expect(mocks.inserted).toHaveLength(2);
  });

  it("reports an unconfirmed outcome when the publication transaction throws", async () => {
    const db = configureDb();
    db.insert.mockImplementation((table) => ({
      values: async (value) => {
        if (table.id === "subprocessorEvents.id") throw new Error("transaction failed");
        mocks.inserted.push({ table: table.id, value });
      },
    }));
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await POST(request({ published: true, mfaCode: "654321" }), context());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("subprocessor_publish_outcome_unconfirmed");
    expect(mocks.auditLog).toHaveBeenLastCalledWith(expect.objectContaining({
      outcome: "error",
      metadata: {
        phase: "publication_result",
        reason: "publication_outcome_unconfirmed",
        published: "true",
      },
    }));
  });
});
