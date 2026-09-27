import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  applyOtPolicy: vi.fn(),
  auditLog: vi.fn(),
  buildTimeExportPdf: vi.fn(),
  buildTimeExportXlsx: vi.fn(),
  canAdminTime: vi.fn(),
  freshMfaStepUp: vi.fn(),
  listEntries: vi.fn(),
  listFiltersForTimeSession: vi.fn(),
  listOtPolicies: vi.fn(),
  reportApiFailure: vi.fn(),
  requireTimeSession: vi.fn(),
  resolveOtPolicy: vi.fn(),
  tenantIdsForTimeSession: vi.fn(),
  weeklyOtFlags: vi.fn(),
}));

vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/auth/time-session", () => ({
  listFiltersForTimeSession: mocks.listFiltersForTimeSession,
  requireTimeSession: mocks.requireTimeSession,
  tenantIdsForTimeSession: mocks.tenantIdsForTimeSession,
}));
vi.mock("@/lib/time/access", () => ({ canAdminTime: mocks.canAdminTime }));
vi.mock("@/lib/time/export-rollup", () => ({
  buildTimeExportPdf: mocks.buildTimeExportPdf,
  buildTimeExportXlsx: mocks.buildTimeExportXlsx,
}));
vi.mock("@/lib/time/ot-policy", () => ({
  applyOtPolicy: mocks.applyOtPolicy,
  resolveOtPolicy: mocks.resolveOtPolicy,
}));
vi.mock("@/lib/time/pay-period", () => ({
  entryDurationHours: vi.fn(() => 2),
  weeklyOtFlags: mocks.weeklyOtFlags,
}));
vi.mock("@/lib/time/store", () => ({
  timeStore: {
    listEntries: mocks.listEntries,
    listOtPolicies: mocks.listOtPolicies,
  },
}));
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: mocks.reportApiFailure,
}));

import { GET, POST } from "@/app/api/time/export/route";

const session = {
  user: {
    id: "president-1",
    unionId: "union-1",
    localId: "local-1",
    roles: ["local_president"],
  },
};

function request(input: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/time/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "client-controlled",
    },
    body: JSON.stringify({
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-15T00:00:00.000Z",
      format: "xlsx",
      ...input,
    }),
  });
}

describe("POST /api/time/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTimeSession.mockResolvedValue({ ok: true, session });
    mocks.canAdminTime.mockReturnValue(true);
    mocks.tenantIdsForTimeSession.mockReturnValue({
      unionId: "union-1",
      localId: "local-1",
    });
    mocks.listFiltersForTimeSession.mockReturnValue({
      unionId: "union-1",
      localId: "local-1",
    });
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
    mocks.listEntries.mockResolvedValue([{ id: "time-entry-1" }]);
    mocks.listOtPolicies.mockResolvedValue([]);
    mocks.resolveOtPolicy.mockReturnValue(null);
    mocks.weeklyOtFlags.mockReturnValue(new Map());
    mocks.buildTimeExportXlsx.mockResolvedValue(new Uint8Array([80, 75]));
    mocks.buildTimeExportPdf.mockResolvedValue(new Blob(["pdf"]));
    mocks.auditLog.mockResolvedValue({});
  });

  it("blocks a direct export before reading time rows", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.listEntries).not.toHaveBeenCalled();
    expect(mocks.buildTimeExportXlsx).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "time.export.xlsx",
        unionId: "union-1",
        localId: "local-1",
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { format: "xlsx", reason: "mfa_step_up_required" },
      }),
    );
  });

  it("preserves throttling and never writes the submitted challenge to audit", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({
      ok: false,
      status: 429,
      code: "limited",
      outcome: "denied",
      retryAfterSeconds: 45,
    });

    const response = await POST(request({ mfaCode: "654321" }));

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    expect((await response.json()).code).toBe("mfa_step_up_limited");
    expect(mocks.listEntries).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
  });

  it("scopes filters and confirms a correlated audit before returning the file", async () => {
    const response = await POST(request({
      format: "xlsx",
      from: "2026-09-02T00:00:00.000Z",
      to: "2026-09-12T00:00:00.000Z",
      category: "release",
      mfaCode: "654321",
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("spreadsheetml");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([80, 75]);
    expect(mocks.listEntries).toHaveBeenCalledWith({
      unionId: "union-1",
      localId: "local-1",
      workerId: undefined,
      category: "release",
      from: "2026-09-02T00:00:00.000Z",
      to: "2026-09-12T00:00:00.000Z",
    });
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "time.export.xlsx",
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { format: "xlsx", category: "release", rowCount: "1" },
      }),
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
  });

  it("uses the PDF builder only after the challenge succeeds", async () => {
    const response = await POST(request({ format: "pdf", mfaCode: "654321" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("time-rollup.pdf");
    expect(await response.text()).toBe("pdf");
    expect(mocks.buildTimeExportPdf).toHaveBeenCalledWith([
      { id: "time-entry-1" },
    ]);
  });

  it("withholds the file if the successful export audit cannot be confirmed", async () => {
    mocks.auditLog.mockRejectedValue(new Error("audit store unavailable"));

    const response = await POST(request({ mfaCode: "654321" }));

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("export_audit_unavailable");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("retires the query-string export path", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
