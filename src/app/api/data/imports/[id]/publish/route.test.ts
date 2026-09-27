import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLog: vi.fn(),
  freshMfaStepUp: vi.fn(),
  publishImport: vi.fn(),
  requireDataAccess: vi.fn(),
  rlsContextForSession: vi.fn(),
  withRlsContext: vi.fn(),
}));

vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/auth/rls-scope", () => ({
  rlsContextForSession: mocks.rlsContextForSession,
}));
vi.mock("@/lib/db/rls-context", () => ({
  withRlsContext: mocks.withRlsContext,
}));
vi.mock("@/lib/data-workbench/access", () => ({
  requireDataAccess: mocks.requireDataAccess,
}));
vi.mock("@/lib/data-workbench/service", () => ({
  publishImport: mocks.publishImport,
}));

import { POST } from "@/app/api/data/imports/[id]/publish/route";

const access = {
  ok: true,
  session: { user: { id: "admin-1", unionId: "union-1", localId: "local-1" } },
  unionId: "union-1",
  localId: "local-1",
  canWrite: true,
};

function request(body?: unknown) {
  return new Request("http://localhost/api/data/imports/import-1/publish", {
    method: "POST",
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      "X-Request-ID": "client-controlled",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function call(body?: unknown) {
  return POST(request(body), { params: Promise.resolve({ id: "import-1" }) });
}

describe("POST /api/data/imports/[id]/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auditLog.mockResolvedValue({});
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(code
        ? { ok: true, required: true }
        : { ok: false, status: 428, code: "required", outcome: "denied" }),
    );
    mocks.publishImport.mockResolvedValue({
      publicationId: "publication-1",
      acceptedCount: 12,
      heldCount: 2,
      status: "partially_published",
    });
    mocks.requireDataAccess.mockResolvedValue(access);
    mocks.rlsContextForSession.mockResolvedValue({ unionId: "union-1", localId: "local-1" });
    mocks.withRlsContext.mockImplementation(async (_context: unknown, callback: () => unknown) => callback());
  });

  it("blocks a direct API publication until a fresh challenge is supplied", async () => {
    const response = await call();
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.freshMfaStepUp).toHaveBeenCalledWith({ userId: "admin-1", code: undefined });
    expect(mocks.publishImport).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "data.import.publish",
      resourceType: "data_import_run",
      resourceId: "import-1",
      unionId: "union-1",
      localId: "local-1",
      outcome: "denied",
      requestId: response.headers.get("X-Request-ID"),
      metadata: { reason: "mfa_step_up_required" },
    }));
  });

  it("honors throttling without invoking the publication service", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({
      ok: false,
      status: 429,
      code: "limited",
      outcome: "denied",
      retryAfterSeconds: 30,
    });

    const response = await call({ mfaCode: "123456" });
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(body.code).toBe("mfa_step_up_limited");
    expect(mocks.publishImport).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("123456");
  });

  it("audits a successful publication with the same server request ID and no code", async () => {
    const response = await call({ mfaCode: "123456" });

    expect(response.status).toBe(201);
    expect(mocks.freshMfaStepUp).toHaveBeenCalledWith({ userId: "admin-1", code: "123456" });
    expect(mocks.publishImport).toHaveBeenCalledWith(access, "import-1");
    expect(mocks.auditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "data.import.publish",
      resourceType: "data_publication",
      resourceId: "publication-1",
      outcome: "success",
      requestId: response.headers.get("X-Request-ID"),
      metadata: {
        acceptedCount: "12",
        heldCount: "2",
      },
    }));
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("123456");
  });

  it("reports an audit failure without claiming the committed publication failed", async () => {
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));

    const response = await call({ mfaCode: "123456" });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("publication_audit_unavailable");
    expect(body.error).toContain("publication completed");
    expect(mocks.publishImport).toHaveBeenCalledOnce();
  });
});
