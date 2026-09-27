import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  applyOtPolicy: vi.fn(),
  auditLog: vi.fn(),
  buildPayrollExportRows: vi.fn(),
  canAdminTime: vi.fn(),
  freshMfaStepUp: vi.fn(),
  listEntries: vi.fn(),
  listFiltersForTimeSession: vi.fn(),
  listOtPolicies: vi.fn(),
  listPayrollProfiles: vi.fn(),
  listWorkers: vi.fn(),
  payrollRowsToCsv: vi.fn(),
  postPayrollWebhook: vi.fn(),
  reportApiFailure: vi.fn(),
  requireTimeSession: vi.fn(),
  resolveOtPolicy: vi.fn(),
  tenantIdsForTimeSession: vi.fn(),
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
vi.mock("@/lib/time/ot-policy", () => ({
  applyOtPolicy: mocks.applyOtPolicy,
  resolveOtPolicy: mocks.resolveOtPolicy,
}));
vi.mock("@/lib/time/payroll-hooks", () => ({
  buildPayrollExportRows: mocks.buildPayrollExportRows,
  payrollRowsToCsv: mocks.payrollRowsToCsv,
  postPayrollWebhook: mocks.postPayrollWebhook,
}));
vi.mock("@/lib/time/store", () => ({
  timeStore: {
    listEntries: mocks.listEntries,
    listOtPolicies: mocks.listOtPolicies,
    listPayrollProfiles: mocks.listPayrollProfiles,
    listWorkers: mocks.listWorkers,
  },
}));
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: mocks.reportApiFailure,
}));

import { POST } from "@/app/api/time/payroll-export/route";

const session = {
  user: {
    id: "president-1",
    unionId: "union-1",
    localId: "local-1",
    roles: ["local_president"],
  },
};
const profile = {
  id: "payroll-profile-1",
  unionId: "union-1",
  localId: "local-1",
  name: "Office payroll",
  vendor: "generic_csv",
  fieldMapping: {},
  includeOtBreakdown: false,
  active: true,
  webhookUrl: "https://payroll.example.test/import",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function request(input: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/time/payroll-export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "client-controlled",
    },
    body: JSON.stringify({
      profileId: profile.id,
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-09-15T00:00:00.000Z",
      ...input,
    }),
  });
}

describe("POST /api/time/payroll-export", () => {
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
    mocks.listPayrollProfiles.mockResolvedValue([profile]);
    mocks.listEntries.mockResolvedValue([{ id: "entry-1" }]);
    mocks.listWorkers.mockResolvedValue([{ id: "worker-1" }]);
    mocks.listOtPolicies.mockResolvedValue([]);
    mocks.resolveOtPolicy.mockReturnValue(null);
    mocks.buildPayrollExportRows.mockReturnValue([
      { employeeNumber: "employee-secret-7" },
    ]);
    mocks.payrollRowsToCsv.mockReturnValue("employeeNumber\nemployee-secret-7");
    mocks.postPayrollWebhook.mockResolvedValue({ ok: true, status: 200 });
    mocks.auditLog.mockResolvedValue({});
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
  });

  it("blocks a direct API payroll export before reading rows or sending the webhook", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.freshMfaStepUp).toHaveBeenCalledWith({
      userId: "president-1",
      code: undefined,
    });
    expect(mocks.listEntries).not.toHaveBeenCalled();
    expect(mocks.postPayrollWebhook).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "time.payroll_export",
        resourceId: profile.id,
        unionId: "union-1",
        localId: "local-1",
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { reason: "mfa_step_up_required" },
      }),
    );
  });

  it("honors attempt throttling without dispatching rows", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({
      ok: false,
      status: 429,
      code: "limited",
      outcome: "denied",
      retryAfterSeconds: 60,
    });

    const response = await POST(request({ mfaCode: "123456" }));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(body.code).toBe("mfa_step_up_limited");
    expect(mocks.postPayrollWebhook).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("123456");
  });

  it("writes a correlated audit record before webhook dispatch and before returning CSV", async () => {
    const response = await POST(request({ mfaCode: "123456" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("X-Payroll-Webhook-Ok")).toBe("true");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(await response.text()).toContain("employee-secret-7");
    expect(mocks.postPayrollWebhook).toHaveBeenCalledWith(
      profile,
      {
        rows: [{ employeeNumber: "employee-secret-7" }],
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-15T00:00:00.000Z",
      },
    );
    expect(mocks.auditLog).toHaveBeenCalledTimes(2);
    expect(mocks.auditLog).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        action: "time.payroll_export.requested",
        resourceId: profile.id,
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { rowCount: "1", webhookConfigured: "true" },
      }),
    );
    expect(mocks.auditLog).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: "time.payroll_export",
        resourceId: profile.id,
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { rowCount: "1", webhookOk: "true", webhookStatus: "200" },
      }),
    );
    expect(
      mocks.auditLog.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    ).toBeLessThan(
      mocks.postPayrollWebhook.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(mocks.auditLog.mock.invocationCallOrder[1] ?? -1).toBeGreaterThan(
      mocks.postPayrollWebhook.mock.invocationCallOrder[0] ?? 0,
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("123456");
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain(
      "employee-secret-7",
    );
  });

  it("does not call the webhook if the pre-dispatch audit is unavailable", async () => {
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));

    const response = await POST(request({ mfaCode: "123456" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("audit_unavailable");
    expect(mocks.postPayrollWebhook).not.toHaveBeenCalled();
  });

  it("still returns the CSV when the webhook rejects rows and reports that result", async () => {
    mocks.postPayrollWebhook.mockResolvedValue({ ok: false, status: 422 });

    const response = await POST(request({ mfaCode: "123456" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Payroll-Webhook-Ok")).toBe("false");
    expect(await response.text()).toContain("employee-secret-7");
    expect(mocks.auditLog).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        action: "time.payroll_export",
        outcome: "error",
        metadata: { rowCount: "1", webhookOk: "false", webhookStatus: "422" },
      }),
    );
  });

  it("warns against blind retry if the webhook ran but the result audit failed", async () => {
    mocks.auditLog
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("audit backend unavailable"));

    const response = await POST(request({ mfaCode: "123456" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("payroll_result_audit_unavailable");
    expect(body.error).toContain("may already have received");
    expect(mocks.postPayrollWebhook).toHaveBeenCalledOnce();
  });

  it("hides another local's profile before requesting MFA", async () => {
    mocks.listPayrollProfiles.mockResolvedValue([]);

    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.postPayrollWebhook).not.toHaveBeenCalled();
  });
});
