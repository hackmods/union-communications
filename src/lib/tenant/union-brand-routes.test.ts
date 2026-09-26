import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  gate: vi.fn(),
  hydrate: vi.fn(),
  tenant: vi.fn(),
  setPreset: vi.fn(),
  setTheme: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/auth/union-admin-session", () => ({ requireUnionAdminSession: mocks.gate }));
vi.mock("@/lib/tenant/loader", () => ({ getTenantContext: mocks.tenant }));
vi.mock("@/lib/tenant/persist", () => ({
  hydrateTenantOverlayFromPostgres: mocks.hydrate,
  setUnionCommsPresetId: mocks.setPreset,
  setUnionBrandTheme: mocks.setTheme,
}));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.audit } }));

import { GET, PATCH } from "@/app/api/union-brand/route";

const tenant = {
  union: { id: "union-a", name: "Union A" },
  brandDefaults: { commsPresetId: null, brandTheme: null },
};
const request = (body: unknown) => new Request("http://localhost/api/union-brand", {
  method: "PATCH",
  body: JSON.stringify(body),
});

describe("union brand routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.gate.mockResolvedValue({ ok: true, userId: "admin-a", unionId: "union-a" });
    mocks.tenant.mockReturnValue(tenant);
    mocks.setPreset.mockResolvedValue({ ok: true });
    mocks.setTheme.mockResolvedValue({ ok: true });
    mocks.audit.mockResolvedValue(undefined);
  });

  it("rejects unauthorized reads and returns only the caller's brand", async () => {
    mocks.gate.mockResolvedValueOnce({ ok: false, status: 403, error: "Forbidden" });
    expect((await GET()).status).toBe(403);
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).union).toEqual({ name: "Union A", commsPresetId: null, brandTheme: null });
    expect(mocks.tenant).toHaveBeenCalledWith("union-a");
  });

  it("never accepts a client target union and rejects unknown presets", async () => {
    expect((await PATCH(request({ unionId: "union-b", commsPresetId: "cupe" }))).status).toBe(400);
    expect((await PATCH(request({ commsPresetId: "forged" }))).status).toBe(400);
    expect(mocks.setPreset).not.toHaveBeenCalled();
  });

  it("writes only the authenticated union and audits changes", async () => {
    const response = await PATCH(request({ commsPresetId: "cupe", brandTheme: null }));
    expect(response.status).toBe(200);
    expect(mocks.setPreset).toHaveBeenCalledWith("union-a", "cupe");
    expect(mocks.setTheme).toHaveBeenCalledWith("union-a", null);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      action: "union_brand.update",
      unionId: "union-a",
      resourceId: "union-a",
    }));
  });
});
