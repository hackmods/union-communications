import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import { brandKitsMeaningfullyDiffer } from "@/lib/brand/brand-kit-diff";
import { dataAdapter } from "@/lib/data/local-storage-adapter";
import { mirrorBrandKitToLocalStorage } from "@/lib/data/mirror-brand-kit";

/**
 * Browser → personal promotion decision (mirrors brand-store hydrate gate).
 * Full hydrate is client-only; this unit covers the import predicate.
 */
describe("browser brand import gate", () => {
  it("imports when Hub has no Local/personal and browser differs", () => {
    const hubSeed = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      primaryColor: "#003DA5",
    });
    const browser = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      primaryColor: "#FF6600",
      local: { ...DEFAULT_BRAND_KIT.local, localNumber: "243" },
    });
    const syncSource = {
      hasLocalShared: false,
      hasPersonalOverlay: false,
      canPublishLocal: true,
    };
    const shouldImport =
      !syncSource.hasLocalShared &&
      !syncSource.hasPersonalOverlay &&
      brandKitsMeaningfullyDiffer(browser, hubSeed);
    expect(shouldImport).toBe(true);
  });

  it("skips import when Local shared already exists", () => {
    const hub = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      primaryColor: "#003DA5",
    });
    const browser = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      primaryColor: "#FF6600",
    });
    const syncSource = {
      hasLocalShared: true,
      hasPersonalOverlay: false,
      canPublishLocal: true,
    };
    const shouldImport =
      !syncSource.hasLocalShared &&
      !syncSource.hasPersonalOverlay &&
      brandKitsMeaningfullyDiffer(browser, hub);
    expect(shouldImport).toBe(false);
  });

  it("skips import when personal overlay already exists", () => {
    const hub = normalizeBrandKit({ ...DEFAULT_BRAND_KIT });
    const browser = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      primaryColor: "#FF6600",
    });
    const syncSource = {
      hasLocalShared: false,
      hasPersonalOverlay: true,
      canPublishLocal: true,
    };
    const shouldImport =
      !syncSource.hasLocalShared &&
      !syncSource.hasPersonalOverlay &&
      brandKitsMeaningfullyDiffer(browser, hub);
    expect(shouldImport).toBe(false);
  });

  it("skips import when browser matches Hub seed", () => {
    const hubSeed = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      primaryColor: "#003DA5",
    });
    const syncSource = {
      hasLocalShared: false,
      hasPersonalOverlay: false,
      canPublishLocal: true,
    };
    const shouldImport =
      !syncSource.hasLocalShared &&
      !syncSource.hasPersonalOverlay &&
      brandKitsMeaningfullyDiffer(hubSeed, hubSeed);
    expect(shouldImport).toBe(false);
  });
});

describe("mirrorBrandKitToLocalStorage", () => {
  beforeEach(() => {
    dataAdapter.resetForTests();
    window.localStorage.clear();
  });

  afterEach(() => {
    dataAdapter.resetForTests();
    window.localStorage.clear();
  });

  it("writes the effective kit for FOUC / logout continuity", async () => {
    const kit = normalizeBrandKit({
      ...DEFAULT_BRAND_KIT,
      primaryColor: "#AABBCC",
      local: { ...DEFAULT_BRAND_KIT.local, localNumber: "7" },
    });
    const ok = await mirrorBrandKitToLocalStorage(kit);
    expect(ok).toBe(true);
    const stored = await dataAdapter.getBrandKit();
    expect(stored?.primaryColor).toBe("#AABBCC");
    expect(stored?.local.localNumber).toBe("7");
  });
});
