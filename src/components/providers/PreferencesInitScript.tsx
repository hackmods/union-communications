import Script from "next/script";
import { USER_PREFERENCES_KEY } from "@/lib/data/adapter";

const preferencesInitScript = `
(function () {
  try {
    var raw = localStorage.getItem("${USER_PREFERENCES_KEY}");
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
    <Script
      id="preferences-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: preferencesInitScript }}
    />
  );
}
