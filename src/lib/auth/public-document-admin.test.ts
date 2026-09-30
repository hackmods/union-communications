import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireSiteAdminSession = vi.fn();
const isMfaEnabled = vi.fn();
const isPostgresConfigured = vi.fn();
const resolveAttachmentStorageMode = vi.fn();

vi.mock("@/lib/auth/site-admin-session", () => ({
  requireSiteAdminSession: () => requireSiteAdminSession(),
}));
vi.mock("@/lib/auth/mfa-policy", () => ({
  isMfaEnabled: () => isMfaEnabled(),
}));
vi.mock("@/lib/db/client", () => ({
  isPostgresConfigured: () => isPostgresConfigured(),
}));
vi.mock("@/lib/attachments/storage", () => ({
  resolveAttachmentStorageMode: () => resolveAttachmentStorageMode(),
}));

describe("requirePublicDocumentAdmin", () => {
  beforeEach(() => {
    vi.resetModules();
    requireSiteAdminSession.mockResolvedValue({
      ok: true,
      session: { user: { id: "admin-1" } },
    });
    isMfaEnabled.mockReturnValue(true);
    isPostgresConfigured.mockReturnValue(true);
    resolveAttachmentStorageMode.mockReturnValue("s3");
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 with mfa_disabled when host MFA is off (not a silent 403)", async () => {
    isMfaEnabled.mockReturnValue(false);
    const { requirePublicDocumentAdmin } = await import(
      "@/lib/auth/public-document-admin"
    );
    await expect(requirePublicDocumentAdmin()).resolves.toMatchObject({
      ok: false,
      status: 503,
      code: "mfa_disabled",
    });
  });

  it("returns 503 for missing durable storage in production", async () => {
    resolveAttachmentStorageMode.mockReturnValue("local");
    const { requirePublicDocumentAdmin } = await import(
      "@/lib/auth/public-document-admin"
    );
    await expect(requirePublicDocumentAdmin()).resolves.toMatchObject({
      ok: false,
      status: 503,
      code: "storage_required",
    });
  });

  it("passes through session auth failures unchanged", async () => {
    requireSiteAdminSession.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
    const { requirePublicDocumentAdmin } = await import(
      "@/lib/auth/public-document-admin"
    );
    await expect(requirePublicDocumentAdmin()).resolves.toEqual({
      ok: false,
      status: 403,
      error: "Forbidden",
    });
  });

  it("returns ok when host MFA, Postgres, and durable storage are ready", async () => {
    const { requirePublicDocumentAdmin } = await import(
      "@/lib/auth/public-document-admin"
    );
    await expect(requirePublicDocumentAdmin()).resolves.toEqual({
      ok: true,
      userId: "admin-1",
    });
  });
});
