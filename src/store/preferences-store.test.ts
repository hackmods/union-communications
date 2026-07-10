import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyPreferencesToDocument } from "@/lib/preferences/apply-preferences";
import { DEFAULT_USER_PREFERENCES } from "@/types/preferences";

describe("applyPreferencesToDocument", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-font-size");
    document.documentElement.removeAttribute("data-high-contrast");
    document.documentElement.removeAttribute("data-reduced-motion");
  });

  it("applies font size attribute for non-default sizes", () => {
    applyPreferencesToDocument({ ...DEFAULT_USER_PREFERENCES, fontSize: "larger" });
    expect(document.documentElement.getAttribute("data-font-size")).toBe("larger");
  });

  it("removes font size attribute for default size", () => {
    document.documentElement.setAttribute("data-font-size", "large");
    applyPreferencesToDocument(DEFAULT_USER_PREFERENCES);
    expect(document.documentElement.hasAttribute("data-font-size")).toBe(false);
  });

  it("applies high contrast and reduced motion attributes", () => {
    applyPreferencesToDocument({
      fontSize: "default",
      highContrast: true,
      reducedMotion: true,
    });
    expect(document.documentElement.hasAttribute("data-high-contrast")).toBe(true);
    expect(document.documentElement.hasAttribute("data-reduced-motion")).toBe(true);
  });

  it("removes high contrast and reduced motion when disabled", () => {
    document.documentElement.setAttribute("data-high-contrast", "");
    document.documentElement.setAttribute("data-reduced-motion", "");
    applyPreferencesToDocument(DEFAULT_USER_PREFERENCES);
    expect(document.documentElement.hasAttribute("data-high-contrast")).toBe(false);
    expect(document.documentElement.hasAttribute("data-reduced-motion")).toBe(false);
  });
});

describe("preferences store", () => {
  const saveUserPreferences = vi.fn();
  const getUserPreferences = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    saveUserPreferences.mockReset();
    getUserPreferences.mockReset();
    getUserPreferences.mockResolvedValue(null);
    saveUserPreferences.mockResolvedValue(undefined);

    vi.doMock("@/lib/data/local-storage-adapter", () => ({
      dataAdapter: {
        getUserPreferences,
        saveUserPreferences,
      },
    }));
  });

  it("hydrates defaults when nothing is stored", async () => {
    const { usePreferencesStore } = await import("@/store/preferences-store");
    await usePreferencesStore.getState().hydrate();
    expect(usePreferencesStore.getState().preferences).toEqual(DEFAULT_USER_PREFERENCES);
    expect(usePreferencesStore.getState().hydrated).toBe(true);
  });

  it("persists font size changes", async () => {
    const { usePreferencesStore } = await import("@/store/preferences-store");
    usePreferencesStore.getState().setFontSize("maximum");
    expect(usePreferencesStore.getState().preferences.fontSize).toBe("maximum");
    expect(saveUserPreferences).toHaveBeenCalledWith({
      ...DEFAULT_USER_PREFERENCES,
      fontSize: "maximum",
    });
    expect(document.documentElement.getAttribute("data-font-size")).toBe("maximum");
  });

  it("persists high contrast and reduced motion toggles", async () => {
    const { usePreferencesStore } = await import("@/store/preferences-store");
    usePreferencesStore.getState().setHighContrast(true);
    usePreferencesStore.getState().setReducedMotion(true);
    expect(saveUserPreferences).toHaveBeenLastCalledWith({
      fontSize: "default",
      highContrast: true,
      reducedMotion: true,
    });
    expect(document.documentElement.hasAttribute("data-high-contrast")).toBe(true);
    expect(document.documentElement.hasAttribute("data-reduced-motion")).toBe(true);
  });
});
