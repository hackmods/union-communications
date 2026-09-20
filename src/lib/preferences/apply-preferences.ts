import type { UserPreferences } from "@/types/preferences";

export function applyPreferencesToDocument(prefs: UserPreferences): void {
  const root = document.documentElement;

  if (prefs.fontSize === "default") {
    root.removeAttribute("data-font-size");
  } else {
    root.setAttribute("data-font-size", prefs.fontSize);
  }

  if (prefs.highContrast) {
    root.setAttribute("data-high-contrast", "");
  } else {
    root.removeAttribute("data-high-contrast");
  }

  if (prefs.reducedMotion) {
    root.setAttribute("data-reduced-motion", "");
  } else {
    root.removeAttribute("data-reduced-motion");
  }
}
