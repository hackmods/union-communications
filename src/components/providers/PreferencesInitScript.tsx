import { USER_PREFERENCES_KEY } from "@/lib/data/adapter";

/**
 * Inline blocking script (not next/script): runs while the parser is still in
 * <head>, so display prefs apply before first paint without the head/script
 * tree mismatch that next/script beforeInteractive caused (React #418).
 */
const preferencesInitScript = `
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(USER_PREFERENCES_KEY)});
    if (!raw) return;
    var prefs = JSON.parse(raw);
    var root = document.documentElement;
    if (prefs.fontSize && prefs.fontSize !== "default") {
      root.setAttribute("data-font-size", prefs.fontSize);
    }
    if (prefs.highContrast) {
      root.setAttribute("data-high-contrast", "");
    }
    if (prefs.reducedMotion) {
      root.setAttribute("data-reduced-motion", "");
    }
  } catch (e) {}
})();
`;

export function PreferencesInitScript() {
  return (
    <script
      id="preferences-init"
      // Trusted FOUC boot only — not user HTML. Required for display prefs.
      dangerouslySetInnerHTML={{ __html: preferencesInitScript }}
    />
  );
}
