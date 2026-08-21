import { BRAND_KIT_KEY, LEGACY_BRAND_KIT_KEY } from "@/lib/data/adapter";
import { BRAND_CHROME_RUNTIME_JS } from "@/lib/brand/chrome-tokens";

/**
 * Inline blocking script (not next/script): runs while the parser is still in
 * <head>, so Brand Kit chrome colours apply before first paint. Without this,
 * `:root` platform orange (--opseu-blue) shows until BrandProvider hydrates.
 * Same FOUC contract as PreferencesInitScript — do not switch to next/script
 * (React #418).
 *
 * Interactive/heading tokens go through `uoChrome` so light accents (CAAT-S
 * gold) never become `text-opseu-dark` on white UI.
 */
const brandChromeInitScript = `
(function () {
  try {
    ${BRAND_CHROME_RUNTIME_JS}
    var raw = localStorage.getItem(${JSON.stringify(BRAND_KIT_KEY)});
    if (!raw) raw = localStorage.getItem(${JSON.stringify(LEGACY_BRAND_KIT_KEY)});
    if (!raw) return;
    var kit = JSON.parse(raw);
    var root = document.documentElement;
    function apply(prop, value) {
      if (!uoHexOk(value)) return;
      root.style.setProperty(prop, value.trim().toUpperCase());
    }
    var primary = kit.primaryColor;
    var secondary = kit.secondaryColor;
    var accent = kit.accentColor;
    apply("--brand-primary", primary);
    apply("--brand-secondary", secondary);
    apply("--brand-accent", accent);
    if (uoHexOk(primary) && uoHexOk(accent)) {
      var chrome = uoChrome(primary.trim(), accent.trim());
      root.style.setProperty("--opseu-blue", chrome.interactive);
      root.style.setProperty("--opseu-dark", chrome.heading);
    } else if (uoHexOk(primary)) {
      apply("--opseu-blue", primary);
    }
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
