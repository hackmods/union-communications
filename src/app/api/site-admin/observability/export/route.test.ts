import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSiteAdminSession = vi.fn();
const verifyFreshMfaStepUp = vi.fn();
const auditLogFn = vi.fn();
const isEnabled = vi.fn();
const exportFn = vi.fn();

vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: (...args: unknown[]) =>
    requireSiteAdminSession(...args),
}));

vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: (...args: unknown[]) => verifyFreshMfaStepUp(...args),
}));

vi.mock("@/lib/audit/store", () => ({
  auditLog: {
    log: (...args: unknown[]) => auditLogFn(...args),
  },
}));

vi.mock("@/lib/audit/request-correlation", () => ({
  createAuditRequestContext: () => ({
    requestId: "req-test",
    responseHeaders: (headers: Headers) => {
      headers.set("X-Request-Id", "req-test");
      return headers;
    },
  }),
}));

vi.mock("@/lib/observability/store", () => ({
  observabilityStore: {
    isEnabled: () => isEnabled(),
    export: (...args: unknown[]) => exportFn(...args),
  },
}));

vi.mock("@/lib/observability/config", () => ({
  resolveObservabilityConfig: () => ({
    errorLogFileEnabled: true,
    errorLogFilePath: "/tmp/x.jsonl",
  }),
}));

describe("POST /api/site-admin/observability/export", () => {
  beforeEach(() => {
    vi.resetModules();
    requireSiteAdminSession.mockReset();
    verifyFreshMfaStepUp.mockReset();
    auditLogFn.mockReset();
    isEnabled.mockReset();
    exportFn.mockReset();
    requireSiteAdminSession.mockResolvedValue({
      ok: true,
      session: { user: { id: "admin-1" } },
    });
    isEnabled.mockReturnValue(true);
    auditLogFn.mockResolvedValue({});
  });

  it("returns 405 on GET", async () => {
    const { GET } = await import(
      "@/app/api/site-admin/observability/export/route"
    );
    const res = await GET();
    expect(res.status).toBe(405);
  });

  it("rejects MFA failure without exporting", async () => {
    verifyFreshMfaStepUp.mockResolvedValue({
      ok: false,
      code: "required",
      status: 428,
      outcome: "denied",
    });
    const { POST } = await import(
      "@/app/api/site-admin/observability/export/route"
    );
    const res = await POST(
      new Request("http://localhost/api/site-admin/observability/export", {
        method: "POST",
        body: JSON.stringify({ format: "csv" }),
      }),
    );
    expect(res.status).toBe(428);
    expect(exportFn).not.toHaveBeenCalled();
    expect(auditLogFn).toHaveBeenCalled();
  });

  it("returns attachment after MFA success", async () => {
    verifyFreshMfaStepUp.mockResolvedValue({ ok: true });
    exportFn.mockResolvedValue({
      format: "jsonl",
      body: '{"id":"1"}\n',
      eventCount: 1,
      contentType: "application/x-ndjson; charset=utf-8",
      filename: "unionops-errors.jsonl",
    });
    const { POST } = await import(
      "@/app/api/site-admin/observability/export/route"
    );
    const res = await POST(
      new Request("http://localhost/api/site-admin/observability/export", {
        method: "POST",
        body: JSON.stringify({ format: "jsonl", limit: 10, mfaCode: "123456" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain(
      "unionops-errors.jsonl",
    );
    expect(await res.text()).toContain('"id":"1"');
    expect(exportFn).toHaveBeenCalled();
  });

  it("returns 503 when store disabled", async () => {
    isEnabled.mockReturnValue(false);
    const { POST } = await import(
      "@/app/api/site-admin/observability/export/route"
    );
    const res = await POST(
      new Request("http://localhost/api/site-admin/observability/export", {
        method: "POST",
        body: JSON.stringify({ format: "csv" }),
      }),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("observability_store_disabled");
  });
});
