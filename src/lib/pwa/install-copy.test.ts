import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

const REQUIRED_INSTALL_KEYS = [
  "title",
  "intro",
  "whyTitle",
  "whyHome",
  "whyOffline",
  "whyStore",
  "iosTitle",
  "iosStep1",
  "iosStep2",
  "iosStep3",
  "androidTitle",
  "androidStep1",
  "androidStep2",
  "androidStep3",
  "desktopTitle",
  "desktopStep1",
  "desktopStep2",
  "desktopStep3",
  "desktopSafari",
  "privacyTitle",
  "privacyBody",
  "troubleTitle",
  "troubleBody",
  "limitsTitle",
  "limitsNetwork",
  "relatedLead",
  "relatedPrivacy",
  "relatedMid",
  "relatedSupport",
  "relatedEnd",
  "backHome",
] as const;

describe("install page i18n", () => {
  it("ships matching EN/FR installPage keys", () => {
    expect(Object.keys(en.installPage).sort()).toEqual(
      Object.keys(fr.installPage).sort(),
    );
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
  });

  it("keeps support and manifesto cross-links without arrow footers", () => {
    expect(en.supportPage.p1ManifestoLink).toMatch(/manifesto|solidarity/i);
    expect(fr.supportPage.p1ManifestoLink.length).toBeGreaterThan(0);
    expect(en.supportPage.backHome).not.toMatch(/[←→]/);
    expect(fr.supportPage.backHome).not.toMatch(/[←→]/);
    expect(en.installPage.backHome).not.toMatch(/[←→]/);
    expect(en.manifesto.backHome).not.toMatch(/[←→]/);
  });

  it("documents apex-only install and platform differences", () => {
    expect(en.installPage.troubleBody).toMatch(/unionops\.org/i);
    expect(en.installPage.troubleBody).toMatch(/www/i);
    expect(en.installPage.desktopStep2).toMatch(/address bar|omnibox/i);
    expect(en.installPage.androidStep3).toMatch(/Install app/i);
    expect(en.installPage.androidStep3).toMatch(/shortcut/i);
    expect(en.installPage.desktopSafari).toMatch(/does not show|never|automatic/i);
    expect(en.installPage.iosStep1).toMatch(/Safari/i);
    expect(fr.installPage.androidTitle.length).toBeGreaterThan(0);
    expect(fr.installPage.desktopSafari).toMatch(/automatique|manuel/i);
    expect(fr.installPage.iosStep3).toMatch(/écran d’accueil|écran d'accueil/i);
  });
});
