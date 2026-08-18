import { BRAND_KIT_KEY, LEGACY_BRAND_KIT_KEY } from "@/lib/data/adapter";

/**
 * Inline blocking script (not next/script): runs while the parser is still in
 * <head>, so Brand Kit chrome colours apply before first paint. Without this,
 * `:root` platform orange (--opseu-blue) shows until BrandProvider hydrates.
 * Same FOUC contract as PreferencesInitScript — do not switch to next/script
 * (React #418).
 */
const brandChromeInitScript = `
(function () {
  try {
    var raw = localStorage.getItem(${JSON.stringify(BRAND_KIT_KEY)});
    if (!raw) raw = localStorage.getItem(${JSON.stringify(LEGACY_BRAND_KIT_KEY)});
    if (!raw) return;
    var kit = JSON.parse(raw);
    var hex = /^#[0-9A-Fa-f]{6}$/;
    var root = document.documentElement;
    function apply(prop, value) {
      if (typeof value !== "string") return;
      var trimmed = value.trim();
      if (!hex.test(trimmed)) return;
      root.style.setProperty(prop, trimmed);
    }
    apply("--brand-primary", kit.primaryColor);
    apply("--brand-secondary", kit.secondaryColor);
    apply("--brand-accent", kit.accentColor);
    apply("--opseu-blue", kit.primaryColor);
    apply("--opseu-dark", kit.accentColor);
  } catch (e) {}
})();
`;

export function BrandChromeInitScript() {
  return (
    <script
      id="brand-chrome-init"
      // Trusted FOUC boot only — not user HTML. Required for Brand Kit chrome.
      dangerouslySetInnerHTML={{ __html: brandChromeInitScript }}
    />
  );
}
