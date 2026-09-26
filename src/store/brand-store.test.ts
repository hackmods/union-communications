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
    vi.unstubAllGlobals();
  });

  it("keeps a treatment edit made while first-visit host defaults are loading", async () => {
    getBrandKit.mockResolvedValueOnce(null);
    let resolveHost!: (value: unknown) => void;
    const hostResponse = new Promise<unknown>((resolve) => { resolveHost = resolve; });
    const fetchHost = vi.fn().mockReturnValue(hostResponse);
    vi.stubGlobal("fetch", fetchHost);
    const { useBrandStore } = await import("@/store/brand-store");

    const hydrating = useBrandStore.getState().hydrate();
    for (let i = 0; i < 4 && !fetchHost.mock.calls.length; i++) await Promise.resolve();
    expect(fetchHost).toHaveBeenCalledWith("/api/host-brand");
    useBrandStore.getState().setBrandKit({ designTreatment: "paper" });
    resolveHost({ ok: true, json: async () => ({ primaryColor: "#003DA5" }) });
    await hydrating;

    expect(useBrandStore.getState().brandKit.designTreatment).toBe("paper");
    expect(useBrandStore.getState().brandKit.primaryColor).toBe("#003DA5");
    await vi.advanceTimersByTimeAsync(400);
    expect(saveBrandKit.mock.calls.at(-1)?.[0].designTreatment).toBe("paper");
  });

  it("does not overwrite a Local pack import that arrives during hydration", async () => {
    getBrandKit.mockResolvedValueOnce(null);
    let resolveHost!: (value: unknown) => void;
    const fetchHost = vi.fn().mockReturnValue(new Promise<unknown>((resolve) => { resolveHost = resolve; }));
    vi.stubGlobal("fetch", fetchHost);
    const { useBrandStore } = await import("@/store/brand-store");

    const hydrating = useBrandStore.getState().hydrate();
    for (let i = 0; i < 4 && !fetchHost.mock.calls.length; i++) await Promise.resolve();
    expect(fetchHost).toHaveBeenCalled();
    useBrandStore.getState().importBrandKit({
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "cupe",
      designTreatment: "paper",
      savedLooks: [{
        id: "council", name: "Council palette", unionPresetId: "cupe",
        primaryColor: "#AF0061", secondaryColor: "#FFFFFF", accentColor: "#800047",
        useOfficialLogo: false,
      }],
    });
    resolveHost({ ok: true, json: async () => ({ primaryColor: "#003DA5" }) });
    await hydrating;

    const kit = useBrandStore.getState().brandKit;
    expect(kit.designTreatment).toBe("paper");
    expect(kit.savedLooks?.[0]?.name).toBe("Council palette");
    expect(kit.primaryColor).toBe(DEFAULT_BRAND_KIT.primaryColor);
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
    expect(useBrandStore.getState().hasStoredBrandKit).toBe(true);

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

  it("factory-resets identity and persists empty defaults instead of leaving stale storage", async () => {
    getBrandKit.mockResolvedValueOnce(null);
    const { useBrandStore } = await import("@/store/brand-store");
    await useBrandStore.getState().hydrate();
    expect(useBrandStore.getState().hasStoredBrandKit).toBe(false);

    useBrandStore.getState().setBrandKit({
      local: { ...DEFAULT_BRAND_KIT.local, localNumber: "404" },
    });
    await vi.advanceTimersByTimeAsync(400);
    expect(useBrandStore.getState().hasStoredBrandKit).toBe(true);

    useBrandStore.getState().resetBrandKit();
    expect(useBrandStore.getState().brandKit.local.localNumber).toBe("");
    expect(useBrandStore.getState().brandKit.local.subText).toBe("");
    // Reset writes factory defaults so reload does not revive the test identity.
    expect(useBrandStore.getState().hasStoredBrandKit).toBe(true);
    await Promise.resolve();
    expect(saveBrandKit).toHaveBeenCalled();
    const last = saveBrandKit.mock.calls.at(-1)?.[0];
    expect(last?.local.localNumber).toBe("");
  });
});
