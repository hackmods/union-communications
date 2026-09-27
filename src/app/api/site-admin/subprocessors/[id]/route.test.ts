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
  updatedRecord: null as Record<string, unknown> | null,
  withRlsContext: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((column, value) => ({ column, value })),
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/auth/mfa-policy", () => ({
  isHostedCustomerMode: mocks.hostedCustomerMode,
}));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/audit/request-correlation", () => ({
  createAuditRequestContext: () => ({
    requestId: "review-request-1",
    responseHeaders: (headers?: HeadersInit) => {
      const result = new Headers(headers);
      result.set("X-Request-ID", "review-request-1");
      return result;
    },
  }),
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
  noStoreJson: (data: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    headers.set("Cache-Control", "private, no-store, max-age=0");
    return Response.json(data, { ...init, headers });
  },
}));

import { POST } from "@/app/api/site-admin/subprocessors/[id]/route";

const access = {
  ok: true,
  actorId: "operator-2",
  rlsContext: { userId: "operator-2", mfaVerified: true },
};

const provider = {
  id: "provider-1",
  serviceName: "Verified hosting",
  reviewStatus: "unreviewed",
  dpaStatus: "under_review",
  publicDisclosureApproved: false,
  reviewOwner: null,
  reviewedBy: null,
  reviewedAt: null,
  createdBy: "operator-1",
  updatedBy: "operator-1",
  internalNotes: "restricted reviewer note",
  verificationEvidence: "private evidence reference",
};

function request(body: unknown) {
  return new Request("https://unionops.test/api/site-admin/subprocessors/provider-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(id = "provider-1") {
  return { params: Promise.resolve({ id }) };
}

function configureDb(rows: unknown[] = [provider]) {
  mocks.rows = { "registry.id": rows };
  mocks.updatedRecord = null;
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
    update: vi.fn(() => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            const [before] = mocks.rows["registry.id"] ?? [];
            mocks.updatedRecord = { ...(before as Record<string, unknown>), ...values };
            return [mocks.updatedRecord];
          },
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

const approvedReview = {
  reviewStatus: "approved",
  dpaStatus: "approved",
  reviewOwner: "Privacy review team",
  publicDisclosureApproved: true,
};

describe("POST /api/site-admin/subprocessors/[id] review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleted = [];
    mocks.inserted = [];
    mocks.updatedRecord = null;
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

  it("requires fresh MFA before reading the provider record", async () => {
    const response = await POST(request(approvedReview), context());

    expect(response.status).toBe(428);
    expect((await response.json()).code).toBe("mfa_step_up_required");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Request-ID")).toBe("review-request-1");
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.withRlsContext).not.toHaveBeenCalled();
  });

  it("rejects unknown request fields before MFA or database access", async () => {
    const response = await POST(request({ ...approvedReview, skipReview: true }), context());

    expect(response.status).toBe(400);
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("requires durable audit storage in hosted customer mode", async () => {
    mocks.hostedCustomerMode.mockReturnValue(true);

    const response = await POST(request(approvedReview), context());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("does not enter RLS work when the intent audit cannot be confirmed", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));

    const response = await POST(request({ ...approvedReview, mfaCode: "654321" }), context());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("audit_unavailable");
    expect(mocks.withRlsContext).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("records the second-person approval and correlated result without logging free text or code", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await POST(request({ ...approvedReview, mfaCode: "654321" }), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.record.reviewedBy).toBe(access.actorId);
    expect(body.record.reviewOwner).toBe("Privacy review team");
    expect(mocks.withRlsContext).toHaveBeenCalledWith(access.rlsContext, expect.any(Function));
    expect(mocks.inserted).toHaveLength(1);
    expect(mocks.inserted[0].value.action).toBe("reviewed");
    expect(mocks.auditLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLog).toHaveBeenLastCalledWith(expect.objectContaining({
      userId: access.actorId,
      action: "site_admin.subprocessor.review",
      resourceId: "provider-1",
      outcome: "success",
      requestId: "review-request-1",
      metadata: {
        phase: "review_result",
        reviewStatus: "approved",
        dpaStatus: "approved",
        publicDisclosureApproved: "true",
      },
    }));
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("Privacy review team");
  });

  it("rejects self-review without writing a review", async () => {
    configureDb([{ ...provider, createdBy: access.actorId }]);
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });

    const response = await POST(request({ ...approvedReview, mfaCode: "654321" }), context());

    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("second_admin_required");
    expect(mocks.updatedRecord).toBeNull();
    expect(mocks.inserted).toHaveLength(0);
    expect(mocks.auditLog).toHaveBeenLastCalledWith(expect.objectContaining({
      outcome: "denied",
      metadata: {
        phase: "review_result",
        reason: "second_admin_required",
        reviewStatus: "approved",
      },
    }));
  });

  it("withholds success and marks the review uncertain when result audit fails", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    mocks.auditLog.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("audit backend unavailable"));

    const response = await POST(request({ ...approvedReview, mfaCode: "654321" }), context());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("subprocessor_review_result_unconfirmed");
    expect(mocks.updatedRecord).not.toBeNull();
    expect(mocks.inserted).toHaveLength(1);
  });
});
