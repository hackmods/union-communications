import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CAAT_S_COLORS,
  CAAT_S_CORAL_PLATE_ID,
  CAAT_S_GOLD_COLORS,
  CAAT_S_GOLD_PLATE_ID,
  IDENTITY_PACKS,
  OPSEU_CAAT_A_PACK_ID,
  OPSEU_CAAT_S_PACK_ID,
  OPSEU_NATIONAL_PACK_ID,
  alignIdentityPackToSector,
  applyIdentityPack,
  colorsMatchIdentityPack,
  defaultIdentityPackId,
  getIdentityPack,
  identityPackAssetGaps,
  identityPackGalleryTiles,
  identityPackSectorGaps,
  identityPacksFor,
  identityPackValidForSector,
  identityAssetPlateColor,
  lockupForCanvasBackground,
  normalizeCampaignPlate,
  resolveCampaignPlateForKit,
  resolveIdentityPackForKit,
  resolveOfficialLogos,
  resolveSiteChromeLogoVariant,
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
        pack.logos.mark,
        pack.logos.markOnDark,
        pack.logos.oneColor,
        ...(pack.plates ?? []).map((p) => p.lockupOnPlate),
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
    expect(identityPacksFor("opseu", "caat-academic").map((p) => p.id)).toEqual([
      OPSEU_NATIONAL_PACK_ID,
      OPSEU_CAAT_A_PACK_ID,
    ]);
    expect(identityPacksFor("opseu", "ops").map((p) => p.id)).toEqual([
      OPSEU_NATIONAL_PACK_ID,
    ]);
    expect(
      identityPacksFor("opseu", "ops").map((p) => p.id),
    ).not.toContain(OPSEU_CAAT_S_PACK_ID);
    expect(identityPacksFor("cupe")).toEqual([]);
  });

  it("does not leak CAAT-S into CAAT-A sector gallery", () => {
    expect(
      identityPacksFor("opseu", "caat-academic").map((p) => p.id),
    ).not.toContain(OPSEU_CAAT_S_PACK_ID);
  });

  it("realigns a CAAT-S Look when the sector no longer matches", () => {
    const caatS = applyIdentityPack(getIdentityPack(OPSEU_CAAT_S_PACK_ID)!);
    const realigned = alignIdentityPackToSector({
      unionPresetId: "opseu",
      opseuSectorId: "boards-of-education",
      identityPackId: caatS.identityPackId,
      campaignPlate: caatS.campaignPlate,
      primaryColor: caatS.primaryColor!,
      secondaryColor: caatS.secondaryColor!,
      accentColor: caatS.accentColor!,
      useOfficialLogo: caatS.useOfficialLogo!,
      officialLogoVariant: caatS.officialLogoVariant,
    });
    expect(realigned.identityPackId).toBe(OPSEU_NATIONAL_PACK_ID);
    expect(identityPackValidForSector(realigned.identityPackId, "boards-of-education")).toBe(
      true,
    );
  });

  it("switches CAAT-S to CAAT-A when the sector becomes College Faculty", () => {
    const caatS = applyIdentityPack(getIdentityPack(OPSEU_CAAT_S_PACK_ID)!);
    const realigned = alignIdentityPackToSector({
      unionPresetId: "opseu",
      opseuSectorId: "caat-academic",
      identityPackId: caatS.identityPackId,
      campaignPlate: caatS.campaignPlate,
      primaryColor: caatS.primaryColor!,
      secondaryColor: caatS.secondaryColor!,
      accentColor: caatS.accentColor!,
      useOfficialLogo: caatS.useOfficialLogo!,
      officialLogoVariant: caatS.officialLogoVariant,
    });
    expect(realigned.identityPackId).toBe(OPSEU_CAAT_A_PACK_ID);
  });

  it("expands CAAT-S into coral and gold gallery tiles", () => {
    const packs = identityPacksFor("opseu", "caat-support");
    expect(identityPackGalleryTiles(packs).map((t) => t.key)).toEqual([
      OPSEU_NATIONAL_PACK_ID,
      `${OPSEU_CAAT_S_PACK_ID}:${CAAT_S_CORAL_PLATE_ID}`,
      `${OPSEU_CAAT_S_PACK_ID}:${CAAT_S_GOLD_PLATE_ID}`,
    ]);
  });

  it("applies pack colours and official logo fields", () => {
    const caat = getIdentityPack(OPSEU_CAAT_S_PACK_ID)!;
    const patch = applyIdentityPack(caat);
    expect(patch.identityPackId).toBe(OPSEU_CAAT_S_PACK_ID);
    expect(patch.primaryColor).toBe(CAAT_S_COLORS.primaryColor);
    expect(patch.accentColor).toBe(CAAT_S_COLORS.accentColor);
    expect(patch.campaignPlate).toBe(CAAT_S_CORAL_PLATE_ID);
    expect(patch.useOfficialLogo).toBe(true);
    expect(patch.officialLogoVariant).toBe("lockup");
  });

  it("defaults CAAT-A to compact mark with full lockup as secondary", () => {
    const caatA = getIdentityPack(OPSEU_CAAT_A_PACK_ID)!;
    expect(caatA.selectableVariants).toEqual(["lockup", "mark"]);
    expect(caatA.defaultVariant).toBe("mark");

    const patch = applyIdentityPack(caatA);
    expect(patch.officialLogoVariant).toBe("mark");

    const logos = resolveOfficialLogos({
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      opseuSectorId: "caat-academic",
      identityPackId: OPSEU_CAAT_A_PACK_ID,
      useOfficialLogo: true,
    });
    expect(logos?.lockup.aspect).toBe("wide");
    expect(logos?.mark?.selectable).toBe(true);
  });

  it("uses compact mark in site chrome when CAAT-A lockup is selected", () => {
    const kit = {
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      opseuSectorId: "caat-academic",
      identityPackId: OPSEU_CAAT_A_PACK_ID,
      useOfficialLogo: true,
      officialLogoVariant: "lockup" as const,
    };
    expect(resolveSiteChromeLogoVariant(kit)).toBe("mark");
    expect(
      resolveSiteChromeLogoVariant({ ...kit, officialLogoVariant: "mark" }),
    ).toBeUndefined();
  });

  it("uses light preview plates and faculty knockout label for CAAT-A assets", () => {
    const caatA = getIdentityPack(OPSEU_CAAT_A_PACK_ID)!;
    expect(caatA.assetVariants.map((v) => v.id)).toEqual([
      "color",
      "knockout",
      "on-coalition",
      "reverse",
    ]);
    const color = caatA.assetVariants.find((v) => v.id === "color")!;
    const knockout = caatA.assetVariants.find((v) => v.id === "knockout")!;
    const coalition = caatA.assetVariants.find((v) => v.id === "on-coalition")!;
    const reverse = caatA.assetVariants.find((v) => v.id === "reverse")!;

    expect(color.plate).toBe("light");
    expect(knockout.plate).toBe("light");
    expect(knockout.labelKey).toBe("knockoutBurgundy");
    expect(knockout.src).toBe("/assets/caat-a/logo-lockup-on-primary-knockout.svg");
    expect(coalition.src).toBe("/assets/caat-a/logo-lockup-on-coalition.svg");
    expect(reverse.plate).toBe("dark");
    expect(reverse.src).toBe("/assets/caat-a/logo-lockup-reverse.svg");
    expect(identityAssetPlateColor(caatA, color)).toBe("#FFFFFF");
    expect(identityAssetPlateColor(caatA, reverse)).toBe("#1A1A1A");
  });

  it("ships CAAT-A plated knockouts with full-bleed plates and a tight one-colour crop", () => {
    const caatA = getIdentityPack(OPSEU_CAAT_A_PACK_ID)!;
    const read = (src: string) =>
      readFileSync(join(process.cwd(), "public", src.replace(/^\//, "")), "utf8");

    const knockout = read(
      caatA.assetVariants.find((v) => v.id === "knockout")!.src,
    );
    const coalition = read(
      caatA.assetVariants.find((v) => v.id === "on-coalition")!.src,
    );
    const reverse = read(
      caatA.assetVariants.find((v) => v.id === "reverse")!.src,
    );
    const oneColor = read(caatA.logos.oneColor!);

    expect(knockout).toMatch(/<rect[^>]*fill="#7B1E3F"/);
    expect(coalition).toMatch(/<rect[^>]*fill="#003DA5"/);
    expect(reverse).toMatch(/<rect[^>]*fill="#231F20"/);

    const knockBox = knockout.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(knockBox).toBeTruthy();
    expect(Number(knockBox![1])).toBe(200);
    expect(Number(knockBox![2])).toBe(100);

    const coalBox = coalition.match(/viewBox="0 0 (\d+) (\d+)"/);
    const revBox = reverse.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(coalBox?.[1]).toBe(knockBox![1]);
    expect(revBox?.[1]).toBe(knockBox![1]);

    const oneBox = oneColor.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(oneBox).toBeTruthy();
    expect(Number(oneBox![1])).toBeGreaterThan(500);
    expect(Number(oneBox![2])).toBeLessThan(120);
  });

  it("applies explicit gold plate colours without an invert shortcut", () => {
    const caat = getIdentityPack(OPSEU_CAAT_S_PACK_ID)!;
    const patch = applyIdentityPack(caat, CAAT_S_GOLD_PLATE_ID);
    expect(patch.campaignPlate).toBe(CAAT_S_GOLD_PLATE_ID);
    expect(patch.primaryColor).toBe(CAAT_S_GOLD_COLORS.primaryColor);
    expect(patch.accentColor).toBe(CAAT_S_GOLD_COLORS.accentColor);
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

  it("coerces legacy primary/accent plate ids onto coral/gold", () => {
    expect(normalizeCampaignPlate("primary", OPSEU_CAAT_S_PACK_ID)).toBe(
      CAAT_S_CORAL_PLATE_ID,
    );
    expect(normalizeCampaignPlate("accent", OPSEU_CAAT_S_PACK_ID)).toBe(
      CAAT_S_GOLD_PLATE_ID,
    );
    expect(
      resolveCampaignPlateForKit({
        identityPackId: OPSEU_CAAT_S_PACK_ID,
        campaignPlate: "accent",
        primaryColor: CAAT_S_GOLD_COLORS.primaryColor,
      }),
    ).toBe(CAAT_S_GOLD_PLATE_ID);
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
      opseuSectorId: "caat-support",
      identityPackId: OPSEU_CAAT_S_PACK_ID,
      useOfficialLogo: true,
    };
    const logos = resolveOfficialLogos(kit);
    expect(logos?.lockup.src).toContain("caat-s");
    expect(logos?.lockup.srcOnDark).toContain("knockout");
    expect(logos?.selectableVariants).toEqual(["lockup"]);
    expect(logos?.mark).toBeUndefined();
  });

  it("uses the gold-plate lockup when the gold campaign plate is active", () => {
    const kit = {
      ...DEFAULT_BRAND_KIT,
      unionPresetId: "opseu",
      opseuSectorId: "caat-support",
      identityPackId: OPSEU_CAAT_S_PACK_ID,
      campaignPlate: CAAT_S_GOLD_PLATE_ID,
      useOfficialLogo: true,
      primaryColor: CAAT_S_GOLD_COLORS.primaryColor,
      accentColor: CAAT_S_GOLD_COLORS.accentColor,
    };
    const logos = resolveOfficialLogos(kit);
    expect(logos?.lockup.srcOnDark).toContain("on-gold");
  });

  it("picks plate lockups from canvas fill hex, not only the active campaign", () => {
    const pack = getIdentityPack(OPSEU_CAAT_S_PACK_ID)!;
    expect(lockupForCanvasBackground(pack, CAAT_S_COLORS.primaryColor)).toContain(
      "knockout",
    );
    expect(
      lockupForCanvasBackground(pack, CAAT_S_GOLD_COLORS.primaryColor),
    ).toContain("on-gold");
    expect(lockupForCanvasBackground(pack, "#FFFFFF")).toBeUndefined();
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
    const platedIds = new Set(["on-primary", "on-gold", "reverse"]);

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
        if (variant.id === "reverse") {
          expect(svg).toMatch(/<rect[^>]*fill="#231f20"/);
        }
      } else {
        expect(rects.length, `${variant.id} should be plate-free`).toBe(0);
      }
    }
  });
});
