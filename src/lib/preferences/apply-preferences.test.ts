import { afterEach, describe, expect, it } from "vitest";
import { applyPreferencesToDocument } from "./apply-preferences";
import { DEFAULT_USER_PREFERENCES } from "@/types/preferences";

const base = DEFAULT_USER_PREFERENCES;

afterEach(() => {
  const root = document.documentElement;
  root.removeAttribute("data-font-size");
  root.removeAttribute("data-high-contrast");
  root.removeAttribute("data-reduced-motion");
});

describe("applyPreferencesToDocument", () => {
  it("sets and clears data-* attributes from prefs", () => {
    applyPreferencesToDocument({
      ...base,
      fontSize: "larger",
      highContrast: true,
      reducedMotion: true,
    });

    const root = document.documentElement;
    expect(root.getAttribute("data-font-size")).toBe("larger");
    expect(root.hasAttribute("data-high-contrast")).toBe(true);
    expect(root.hasAttribute("data-reduced-motion")).toBe(true);

    applyPreferencesToDocument(base);
    expect(root.hasAttribute("data-font-size")).toBe(false);
    expect(root.hasAttribute("data-high-contrast")).toBe(false);
    expect(root.hasAttribute("data-reduced-motion")).toBe(false);
  });
});
