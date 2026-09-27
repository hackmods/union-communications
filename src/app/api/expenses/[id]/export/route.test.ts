import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auditLog: vi.fn(),
  assertExpenseView: vi.fn(),
  buildExpenseExportPdf: vi.fn(),
  buildExpenseExportXlsx: vi.fn(),
  buildExpenseReceiptZip: vi.fn(),
  expenseExportFilename: vi.fn(),
  expenseGetById: vi.fn(),
  freshMfaStepUp: vi.fn(),
  reportApiFailure: vi.fn(),
  requireExpenseSession: vi.fn(),
}));

vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/expenses-session", () => ({
  assertExpenseView: mocks.assertExpenseView,
  requireExpenseSession: mocks.requireExpenseSession,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/expenses/export", () => ({
  buildExpenseExportPdf: mocks.buildExpenseExportPdf,
  buildExpenseExportXlsx: mocks.buildExpenseExportXlsx,
  buildExpenseReceiptZip: mocks.buildExpenseReceiptZip,
  expenseExportFilename: mocks.expenseExportFilename,
}));
vi.mock("@/lib/expenses/store", () => ({
  expenseStore: { getById: mocks.expenseGetById },
}));
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: mocks.reportApiFailure,
}));

import {
  GET,
  POST,
} from "@/app/api/expenses/[id]/export/route";

const session = {
  user: {
    id: "officer-1",
    unionId: "union-1",
    localId: "local-1",
  },
};
const submission = {
  id: "expense-1",
  unionId: "union-1",
  localId: "local-1",
  title: "Receipt data",
};

function params(id = "expense-1") {
  return { params: Promise.resolve({ id }) };
}

function request(body: unknown) {
  return new Request("http://localhost/api/expenses/expense-1/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "client-controlled",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/expenses/[id]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireExpenseSession.mockResolvedValue({ ok: true, session });
    mocks.assertExpenseView.mockReturnValue(true);
    mocks.expenseGetById.mockResolvedValue(submission);
    mocks.auditLog.mockResolvedValue({});
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
    mocks.buildExpenseExportXlsx.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mocks.buildExpenseExportPdf.mockResolvedValue(
      new Blob([new Uint8Array([4, 5])], { type: "application/pdf" }),
    );
    mocks.buildExpenseReceiptZip.mockResolvedValue(
      new Blob([new Uint8Array([6, 7])], { type: "application/zip" }),
    );
    mocks.expenseExportFilename.mockReturnValue("expense-export.xlsx");
  });

  it("blocks a direct API export until a fresh challenge is supplied", async () => {
    const response = await POST(request({ format: "xlsx" }), params());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.freshMfaStepUp).toHaveBeenCalledWith({
      userId: "officer-1",
      code: undefined,
    });
    expect(mocks.buildExpenseExportXlsx).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "officer-1",
        action: "expenses.export",
        resourceType: "expense_submission",
        resourceId: "expense-1",
        unionId: "union-1",
        localId: "local-1",
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { format: "xlsx", reason: "mfa_step_up_required" },
      }),
    );
  });

  it("honors MFA throttling and never writes the code to audit metadata", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({
      ok: false,
      status: 429,
      code: "limited",
      outcome: "denied",
      retryAfterSeconds: 45,
    });

    const response = await POST(request({ format: "pdf", mfaCode: "123456" }), params());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    expect(body.code).toBe("mfa_step_up_limited");
    expect(mocks.buildExpenseExportPdf).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("123456");
  });

  it("audits the successful download with the server request ID and no code", async () => {
    const response = await POST(
      request({ format: "xlsx", mfaCode: "123456" }),
      params(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(
      Array.from(new Uint8Array(await response.arrayBuffer())),
    ).toEqual([1, 2, 3]);
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "expenses.export",
        resourceType: "expense_submission",
        resourceId: "expense-1",
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { format: "xlsx" },
      }),
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("123456");
  });

  it("fails closed when it cannot confirm the success audit record", async () => {
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));

    const response = await POST(
      request({ format: "xlsx", mfaCode: "123456" }),
      params(),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("export_audit_unavailable");
    expect(mocks.buildExpenseExportXlsx).toHaveBeenCalledOnce();
    expect(body.code).toBe("export_audit_unavailable");
  });

  it("keeps cross-scope exports hidden and does not request step-up", async () => {
    mocks.assertExpenseView.mockReturnValue(false);

    const response = await POST(request({ format: "xlsx" }), params());

    expect(response.status).toBe(404);
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.buildExpenseExportXlsx).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "expenses.export",
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { format: "xlsx", reason: "not_found_or_out_of_scope" },
      }),
    );
  });

  it("returns a correlated unavailable response if the expense store fails", async () => {
    mocks.expenseGetById.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request({ format: "xlsx" }), params());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.code).toBe("export_unavailable");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "expenses.export",
        outcome: "error",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { format: "xlsx", reason: "expense_lookup_failed" },
      }),
    );
  });

  it("retires the old GET download path", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
