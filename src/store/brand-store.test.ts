import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";

const SAVED_PRIMARY = "#003DA5";

describe("brand store hydrate vs early canvas patch", () => {
  const getBrandKit = vi.fn();
  const saveBrandKit = vi.fn();
  const clearBrandKit = vi.fn();
  const isOnboardingComplete = vi.fn();
  const setOnboardingComplete = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    getBrandKit.mockReset();
    saveBrandKit.mockReset();
    clearBrandKit.mockReset();
    isOnboardingComplete.mockReset();
    setOnboardingComplete.mockReset();
    getBrandKit.mockResolvedValue({
      ...DEFAULT_BRAND_KIT,
      primaryColor: SAVED_PRIMARY,
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
      local: { ...DEFAULT_BRAND_KIT.local, localNumber: "243" },
    });
    saveBrandKit.mockResolvedValue(undefined);
    isOnboardingComplete.mockResolvedValue(true);

    vi.doMock("@/lib/data/local-storage-adapter", () => ({
      dataAdapter: {
        getBrandKit,
        saveBrandKit,
        clearBrandKit,
        isOnboardingComplete,
        setOnboardingComplete,
      },
      LocalStorageAdapter: class LocalStorageAdapter {},
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock("@/lib/data/local-storage-adapter");
  });

  it("does not persist default colours when canvas fonts change before hydrate", async () => {
    const { useBrandStore } = await import("@/store/brand-store");
    expect(useBrandStore.getState().hydrated).toBe(false);

    useBrandStore.getState().setBrandKit({
      canvas: { headlineFontId: "oswald", bodyFontId: "sourceSerif" },
    });

    await vi.advanceTimersByTimeAsync(400);
    expect(saveBrandKit).not.toHaveBeenCalled();
    expect(useBrandStore.getState().brandKit.primaryColor).toBe(
      DEFAULT_BRAND_KIT.primaryColor,
    );
  });

  it("applies queued canvas fonts onto the stored theme after hydrate", async () => {
    const { useBrandStore } = await import("@/store/brand-store");

    useBrandStore.getState().setBrandKit({
      canvas: { headlineFontId: "oswald" },
    });
    useBrandStore.getState().setBrandKit({
      canvas: { bodyFontId: "sourceSerif" },
    });

    await useBrandStore.getState().hydrate();

    const kit = useBrandStore.getState().brandKit;
    expect(kit.primaryColor).toBe(SAVED_PRIMARY);
    expect(kit.canvas?.headlineFontId).toBe("oswald");
    expect(kit.canvas?.bodyFontId).toBe("sourceSerif");

    await vi.advanceTimersByTimeAsync(400);
    expect(saveBrandKit).toHaveBeenCalledTimes(1);
    const persisted = saveBrandKit.mock.calls[0][0] as {
      primaryColor: string;
      canvas?: { headlineFontId?: string; bodyFontId?: string };
    };
    expect(persisted.primaryColor).toBe(SAVED_PRIMARY);
    expect(persisted.canvas?.headlineFontId).toBe("oswald");
    expect(persisted.canvas?.bodyFontId).toBe("sourceSerif");
  });

  it("saves canvas patches after hydrate without touching colours", async () => {
    const { useBrandStore } = await import("@/store/brand-store");
    await useBrandStore.getState().hydrate();
    expect(saveBrandKit).not.toHaveBeenCalled();

    useBrandStore.getState().setBrandKit({
      canvas: { headlineFontId: "barlowCondensed" },
    });

    expect(useBrandStore.getState().brandKit.primaryColor).toBe(SAVED_PRIMARY);
    await vi.advanceTimersByTimeAsync(400);
    expect(saveBrandKit).toHaveBeenCalledTimes(1);
    expect(saveBrandKit.mock.calls[0][0].primaryColor).toBe(SAVED_PRIMARY);
    expect(saveBrandKit.mock.calls[0][0].canvas?.headlineFontId).toBe(
      "barlowCondensed",
    );
  });

  it("persists logo patches immediately without waiting for debounce", async () => {
    const { useBrandStore } = await import("@/store/brand-store");
    await useBrandStore.getState().hydrate();
    saveBrandKit.mockClear();

    useBrandStore.getState().setBrandKit({
      useOfficialLogo: true,
      officialLogoVariant: "lockup",
      customLogoDataUrl: undefined,
    });

    expect(saveBrandKit).toHaveBeenCalledTimes(1);
    expect(saveBrandKit.mock.calls[0][0].useOfficialLogo).toBe(true);
    await vi.advanceTimersByTimeAsync(400);
    expect(saveBrandKit).toHaveBeenCalledTimes(1);
  });
});
