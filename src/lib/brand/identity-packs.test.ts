import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CAAT_S_COLORS,
  IDENTITY_PACKS,
  OPSEU_CAAT_S_PACK_ID,
  OPSEU_NATIONAL_PACK_ID,
  applyIdentityPack,
  colorsMatchIdentityPack,
  defaultIdentityPackId,
  getIdentityPack,
  identityPackAssetGaps,
  identityPackSectorGaps,
  identityPacksFor,
  resolveIdentityPackForKit,
  resolveOfficialLogos,
} from "./identity-packs";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe("identity-packs", () => {
  it("ships unique ids, valid hex, and existing logo paths", () => {
    const ids = new Set<string>();
    for (const pack of IDENTITY_PACKS) {
      expect(ids.has(pack.id)).toBe(false);
      ids.add(pack.id);
      expect(pack.colors.primaryColor).toMatch(HEX);
      expect(pack.colors.secondaryColor).toMatch(HEX);
      expect(pack.colors.accentColor).toMatch(HEX);
      expect(pack.selectableVariants.length).toBeGreaterThan(0);
      expect(pack.selectableVariants).toContain(pack.defaultVariant);
      for (const src of [
        pack.logos.lockup,
        pack.logos.lockupOnDark,
        pack.logos.lockupOnAccent,
        pack.logos.mark,
        pack.logos.markOnDark,
        pack.logos.oneColor,
      ]) {
        if (!src) continue;
        expect(src.startsWith("/")).toBe(true);
        const disk = join(process.cwd(), "public", src.replace(/^\//, ""));
        expect(existsSync(disk), `missing ${src}`).toBe(true);
      }
    }
    expect(identityPackSectorGaps()).toEqual([]);
    expect(identityPackAssetGaps()).toEqual([]);
  });

  it("defaults OPSEU to national and offers CAAT-S only for College Support", () => {
    expect(defaultIdentityPackId("opseu")).toBe(OPSEU_NATIONAL_PACK_ID);
    expect(identityPacksFor("opseu", "caat-support").map((p) => p.id)).toEqual([
      OPSEU_NATIONAL_PACK_ID,
      OPSEU_CAAT_S_PACK_ID,
    ]);
    expect(identityPacksFor("opseu", "ops").map((p) => p.id)).toEqual([
      OPSEU_NATIONAL_PACK_ID,
    ]);
    expect(
      identityPacksFor("opseu", "ops", OPSEU_CAAT_S_PACK_ID).map((p) => p.id),
    ).toContain(OPSEU_CAAT_S_PACK_ID);
    expect(identityPacksFor("cupe")).toEqual([]);
  });

  it("applies pack colours and official logo fields", () => {
    const caat = getIdentityPack(OPSEU_CAAT_S_PACK_ID)!;
    const patch = applyIdentityPack(caat);
    expect(patch.identityPackId).toBe(OPSEU_CAAT_S_PACK_ID);
    expect(patch.primaryColor).toBe(CAAT_S_COLORS.primaryColor);
    expect(patch.accentColor).toBe(CAAT_S_COLORS.accentColor);
    expect(patch.campaignPlate).toBe("primary");
    expect(patch.useOfficialLogo).toBe(true);
    expect(patch.officialLogoVariant).toBe("lockup");
  });

  it("swaps coral and gold when the accent plate is applied", () => {
    const caat = getIdentityPack(OPSEU_CAAT_S_PACK_ID)!;
    const patch = applyIdentityPack(caat, "accent");
    expect(patch.campaignPlate).toBe("accent");
    expect(patch.primaryColor).toBe(CAAT_S_COLORS.accentColor);
    expect(patch.accentColor).toBe(CAAT_S_COLORS.primaryColor);
    expect(
      colorsMatchIdentityPack(
        {
          primaryColor: patch.primaryColor!,
          secondaryColor: patch.secondaryColor!,
          accentColor: patch.accentColor!,
        },
        caat,
      ),
    ).toBe(true);
  });

  it("clears campaignPlate when applying a single-palette Look", () => {
    const national = getIdentityPack(OPSEU_NATIONAL_PACK_ID)!;
    expect(applyIdentityPack(national).campaignPlate).toBeUndefined();
  });

  it("resolves missing identityPackId to national for OPSEU official kits", () => {
    const kit = {
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      useOfficialLogo: true,
      identityPackId: undefined,
    };
    expect(resolveIdentityPackForKit(kit)?.id).toBe(OPSEU_NATIONAL_PACK_ID);
    const logos = resolveOfficialLogos(kit);
    expect(logos?.packId).toBe(OPSEU_NATIONAL_PACK_ID);
    expect(logos?.selectableVariants).toContain("mark");
  });

  it("resolves CAAT-S logos without a mark radio", () => {
    const kit = {
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      identityPackId: OPSEU_CAAT_S_PACK_ID,
      useOfficialLogo: true,
    };
    const logos = resolveOfficialLogos(kit);
    expect(logos?.lockup.src).toContain("caat-s");
    expect(logos?.lockup.srcOnDark).toContain("knockout");
    expect(logos?.selectableVariants).toEqual(["lockup"]);
    expect(logos?.mark).toBeUndefined();
  });

  it("uses the gold-plate lockup when the accent campaign plate is active", () => {
    const kit = {
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      identityPackId: OPSEU_CAAT_S_PACK_ID,
      campaignPlate: "accent" as const,
      useOfficialLogo: true,
      primaryColor: CAAT_S_COLORS.accentColor,
      accentColor: CAAT_S_COLORS.primaryColor,
    };
    const logos = resolveOfficialLogos(kit);
    expect(logos?.lockup.srcOnDark).toContain("on-gold");
  });

  it("detects colour drift from the active pack", () => {
    const pack = getIdentityPack(OPSEU_CAAT_S_PACK_ID)!;
    expect(
      colorsMatchIdentityPack(
        {
          primaryColor: pack.colors.primaryColor,
          secondaryColor: pack.colors.secondaryColor,
          accentColor: pack.colors.accentColor,
        },
        pack,
      ),
    ).toBe(true);
    expect(
      colorsMatchIdentityPack(
        {
          primaryColor: "#003DA5",
          secondaryColor: pack.colors.secondaryColor,
          accentColor: pack.colors.accentColor,
        },
        pack,
      ),
    ).toBe(false);
  });

  it("ships downloadable asset variants with files on disk", () => {
    const caat = getIdentityPack(OPSEU_CAAT_S_PACK_ID)!;
    expect(caat.assetVariants.map((v) => v.id)).toEqual([
      "color",
      "on-primary",
      "knockout",
      "on-gold",
      "one-color",
      "reverse",
    ]);
    for (const variant of caat.assetVariants) {
      const disk = join(process.cwd(), "public", variant.src.replace(/^\//, ""));
      expect(existsSync(disk), `missing ${variant.src}`).toBe(true);
    }
  });

  it("normalizes CAAT-S SVG artboards so plated downloads cover the viewBox", () => {
    const caat = getIdentityPack(OPSEU_CAAT_S_PACK_ID)!;
    const platedIds = new Set(["on-primary", "on-gold"]);

    for (const variant of caat.assetVariants) {
      if (!variant.src.endsWith(".svg")) continue;
      const disk = join(process.cwd(), "public", variant.src.replace(/^\//, ""));
      const svg = readFileSync(disk, "utf8");
      expect(svg, variant.src).toMatch(/viewBox="0 0 174 97"/);
      expect(svg, variant.src).toMatch(/width="174"/);
      expect(svg, variant.src).toMatch(/height="97"/);
      expect(svg, variant.src).toMatch(/<g transform="translate\(/);

      const rects = [
        ...svg.matchAll(
          /<rect\b[^>]*\bwidth="([^"]+)"[^>]*\bheight="([^"]+)"[^>]*\/>/g,
        ),
      ];
      const isPlated = platedIds.has(variant.id);
      if (isPlated) {
        expect(rects.length, `${variant.id} plate rect`).toBeGreaterThan(0);
        const first = rects[0]!;
        expect(Number(first[1])).toBe(174);
        expect(Number(first[2])).toBe(97);
        expect(svg).toMatch(/<rect[^>]*\bx="0"/);
        expect(svg).toMatch(/<rect[^>]*\by="0"/);
      } else {
        expect(rects.length, `${variant.id} should be plate-free`).toBe(0);
      }
    }
  });
});
