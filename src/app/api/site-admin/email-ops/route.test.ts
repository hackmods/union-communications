import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSiteAdminSession: vi.fn(),
  sendClassifiedEmail: vi.fn(),
  auditLog: vi.fn(),
  getSmtpConfigSnapshot: vi.fn(() => ({
    preferredTransport: "none",
    from: null,
    mailgunApiConfigured: false,
    host: null,
  })),
  isEmailEnabled: vi.fn(() => false),
  isTransactionalEmailAvailable: vi.fn(() => false),
  readProductNewsConfig: vi.fn(() => ({
    enabled: false,
    reason: "disabled",
  })),
}));

vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: mocks.requireSiteAdminSession,
}));
vi.mock("@/lib/email/send", () => ({
  sendClassifiedEmail: mocks.sendClassifiedEmail,
  getSmtpConfigSnapshot: mocks.getSmtpConfigSnapshot,
  isEmailEnabled: mocks.isEmailEnabled,
  isTransactionalEmailAvailable: mocks.isTransactionalEmailAvailable,
}));
vi.mock("@/lib/email/product-news-config", () => ({
  readProductNewsConfig: mocks.readProductNewsConfig,
}));
vi.mock("@/lib/audit/store", () => ({
  auditLog: { log: mocks.auditLog },
}));

import { GET, POST } from "./route";

describe("site-admin email-ops API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSiteAdminSession.mockResolvedValue({
      ok: true,
      session: { user: { id: "admin-1", roles: ["platform_admin"] } },
    });
  });

  it("returns preset catalog and health for site admins", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.presets.length).toBeGreaterThan(0);
    expect(body.health.emailFlag).toBe(false);
  });

  it("previews multipart invite fixture", async () => {
    const response = await POST(
      new Request("http://localhost/api/site-admin/email-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          presetId: "invite_accept",
          locale: "en",
        }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.artifact.subject).toMatch(/Officer Hub/);
    expect(body.artifact.html).toContain("<!DOCTYPE html>");
    expect(body.valid.ok).toBe(true);
  });

  it("denies unauthenticated access", async () => {
    mocks.requireSiteAdminSession.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    const response = await GET();
    expect(response.status).toBe(401);
  });
});
