import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

const REQUIRED_INSTALL_KEYS = [
  "title",
  "intro",
  "whereTitle",
  "whereBody",
  "chromeTitle",
  "chromeStep1",
  "chromeStep2",
  "chromeStep3",
  "safariTitle",
  "safariBody",
  "limitsTitle",
  "limitsOffline",
  "limitsNetwork",
  "limitsNoStore",
  "toPrivacy",
  "toSupport",
  "backHome",
] as const;

describe("install page i18n", () => {
  it("ships matching EN/FR installPage keys", () => {
    for (const key of REQUIRED_INSTALL_KEYS) {
      expect(en.installPage[key], `en.installPage.${key}`).toBeTypeOf("string");
      expect(fr.installPage[key], `fr.installPage.${key}`).toBeTypeOf("string");
      expect(en.installPage[key].length).toBeGreaterThan(0);
      expect(fr.installPage[key].length).toBeGreaterThan(0);
    }
  });

  it("exposes a quiet footer install label in both locales", () => {
    expect(en.footer.installApp).toMatch(/install/i);
    expect(fr.footer.installApp.length).toBeGreaterThan(0);
    expect(en.supportPage.toInstall).toMatch(/install/i);
    expect(fr.supportPage.toInstall.length).toBeGreaterThan(0);
  });
});
