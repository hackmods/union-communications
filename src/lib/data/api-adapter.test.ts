import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiAdapter } from "./api-adapter";
import type { BrandKit } from "@/types/entities";
import type { UserPreferences } from "@/types/preferences";

const brandKit: BrandKit = {
  version: "2.0",
  local: { id: "local-1", localNumber: "243", subText: "Support" },
  primaryColor: "#003DA5",
  secondaryColor: "#FFFFFF",
  accentColor: "#002868",
  useOfficialLogo: true,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const preferences: UserPreferences = {
  fontSize: "default",
  highContrast: false,
  reducedMotion: false,
  stewardMobileMode: false,
};

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("ApiAdapter", () => {
  let adapter: ApiAdapter;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    adapter = new ApiAdapter();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads a brand kit via GET /api/brand-kit", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ brandKit, onboardingComplete: true }),
    );

    const loaded = await adapter.getBrandKit();
    expect(loaded).toEqual(brandKit);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/brand-kit",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("saves a brand kit via PUT /api/brand-kit", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ brandKit, onboardingComplete: false }));

    await adapter.saveBrandKit(brandKit);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/brand-kit",
      expect.objectContaining({
        method: "PUT",
        credentials: "include",
        body: JSON.stringify({ brandKit }),
      }),
    );
  });

  it("clears a brand kit via DELETE /api/brand-kit", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ brandKit: null, onboardingComplete: false }));
    await adapter.clearBrandKit();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/brand-kit",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("reads onboarding completion", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ brandKit: null, onboardingComplete: true }),
    );
    expect(await adapter.isOnboardingComplete()).toBe(true);
  });

  it("round-trips preferences", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ preferences }));
    const loaded = await adapter.getUserPreferences();
    expect(loaded).toEqual(preferences);

    fetchMock.mockResolvedValueOnce(jsonResponse({ preferences }));
    await adapter.saveUserPreferences(preferences);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/preferences",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ preferences }),
      }),
    );
  });

  it("degrades gracefully on a 401 (no throw)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Unauthorized" }, false, 401));
    await expect(adapter.getBrandKit()).resolves.toBeNull();
  });

  it("degrades gracefully when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    await expect(adapter.getUserPreferences()).resolves.toBeNull();
  });
});
