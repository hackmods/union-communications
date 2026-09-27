import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertTravelView: vi.fn(),
  auditLog: vi.fn(),
  buildReceiptZip: vi.fn(),
  buildTravelExportPdf: vi.fn(),
  buildTravelExportXlsx: vi.fn(),
  freshMfaStepUp: vi.fn(),
  getAdvanceForAuth: vi.fn(),
  getAuthorization: vi.fn(),
  getClaimForAuth: vi.fn(),
  reportApiFailure: vi.fn(),
  requireTravelSession: vi.fn(),
  travelExportFilename: vi.fn(),
}));

vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/travel-session", () => ({
  assertTravelView: mocks.assertTravelView,
  requireTravelSession: mocks.requireTravelSession,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/travel/export", () => ({
  buildReceiptZip: mocks.buildReceiptZip,
  buildTravelExportPdf: mocks.buildTravelExportPdf,
  buildTravelExportXlsx: mocks.buildTravelExportXlsx,
  travelExportFilename: mocks.travelExportFilename,
}));
vi.mock("@/lib/travel/store", () => ({
  travelStore: {
    getAdvanceForAuth: mocks.getAdvanceForAuth,
    getAuthorization: mocks.getAuthorization,
    getClaimForAuth: mocks.getClaimForAuth,
  },
}));
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: mocks.reportApiFailure,
}));

import { GET, POST } from "@/app/api/travel/[id]/export/route";

const session = {
  user: {
    id: "officer-1",
    unionId: "union-1",
    localId: "local-1",
  },
};
const authorization = {
  id: "travel-1",
  unionId: "union-1",
  localId: "local-1",
  requestedById: "officer-1",
  requestedByName: "Officer One",
  purpose: "Conference",
  eventName: "Annual meeting",
  eventStartDate: "2026-10-01",
  eventEndDate: "2026-10-03",
  estimatedCosts: {
    travel: 100,
    lodging: 200,
    meals: 80,
    registration: 50,
    other: 0,
  },
  status: "approved",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};
const advance = { id: "advance-1", amount: 250, unionId: "union-1", localId: "local-1" };
const claim = {
  id: "claim-1",
  lineItems: [{ id: "line-1", description: "receipt contents" }],
  unionId: "union-1",
  localId: "local-1",
};

function params(id = "travel-1") {
  return { params: Promise.resolve({ id }) };
}

function request(body: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/travel/travel-1/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "client-controlled",
    },
    body: JSON.stringify({ format: "xlsx", ...body }),
  });
}

describe("POST /api/travel/[id]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTravelSession.mockResolvedValue({ ok: true, session });
    mocks.assertTravelView.mockReturnValue(true);
    mocks.getAuthorization.mockResolvedValue(authorization);
    mocks.getAdvanceForAuth.mockResolvedValue(advance);
    mocks.getClaimForAuth.mockResolvedValue(claim);
    mocks.auditLog.mockResolvedValue({});
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
    mocks.buildTravelExportXlsx.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mocks.buildTravelExportPdf.mockResolvedValue(
      new Blob([new Uint8Array([4, 5])], { type: "application/pdf" }),
    );
    mocks.buildReceiptZip.mockResolvedValue(
      new Blob([new Uint8Array([6, 7])], { type: "application/zip" }),
    );
    mocks.travelExportFilename.mockImplementation(
      (_auth: unknown, format: string) => `travel-export.${format}`,
    );
  });

  it("requires fresh MFA before reading advances, claims, or receipt content", async () => {
    const response = await POST(request(), params());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.getAdvanceForAuth).not.toHaveBeenCalled();
    expect(mocks.getClaimForAuth).not.toHaveBeenCalled();
    expect(mocks.buildTravelExportXlsx).not.toHaveBeenCalled();
    expect(mocks.buildReceiptZip).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "officer-1",
        action: "travel.export",
        resourceType: "travel_authorization",
        resourceId: "travel-1",
        unionId: "union-1",
        localId: "local-1",
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { format: "xlsx", reason: "mfa_step_up_required" },
      }),
    );
  });

  it("preserves throttling and never writes the challenge code to audit", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({
      ok: false,
      status: 429,
      code: "limited",
      outcome: "denied",
      retryAfterSeconds: 60,
    });

    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect((await response.json()).code).toBe("mfa_step_up_limited");
    expect(mocks.getAdvanceForAuth).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
  });

  it("returns an audited XLSX with the server request ID after successful challenge", async () => {
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("spreadsheetml");
    expect(response.headers.get("Content-Disposition")).toContain("travel-export.xlsx");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(mocks.buildTravelExportXlsx).toHaveBeenCalledWith({
      auth: authorization,
      advance,
      claim,
    });
    expect(mocks.buildTravelExportXlsx.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.auditLog.mock.invocationCallOrder[0],
    );
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "travel.export",
        resourceType: "travel_authorization",
        resourceId: "travel-1",
        unionId: "union-1",
        localId: "local-1",
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { format: "xlsx" },
      }),
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("receipt contents");
  });

  it("returns a PDF only after the fresh challenge succeeds", async () => {
    const response = await POST(
      request({ format: "pdf", mfaCode: "654321" }),
      params(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("travel-export.pdf");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([4, 5]);
    expect(mocks.buildTravelExportPdf).toHaveBeenCalledWith({
      auth: authorization,
      advance,
      claim,
    });
  });

  it("includes protected receipt files in ZIP export only after challenge", async () => {
    const response = await POST(
      request({ format: "zip", mfaCode: "654321" }),
      params(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toContain("travel-export.zip");
    expect(mocks.buildReceiptZip).toHaveBeenCalledWith(
      expect.objectContaining({ auth: authorization, claim }),
    );
  });

  it("withholds bytes when the successful audit record cannot be confirmed", async () => {
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));

    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("export_audit_unavailable");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Disposition")).toBeNull();
  });

  it("does not challenge or build an export for an out-of-scope record", async () => {
    mocks.assertTravelView.mockReturnValue(false);

    const response = await POST(request(), params());

    expect(response.status).toBe(404);
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.getAdvanceForAuth).not.toHaveBeenCalled();
    expect(mocks.buildTravelExportXlsx).not.toHaveBeenCalled();
  });

  it("retires the legacy query-string download URL", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
