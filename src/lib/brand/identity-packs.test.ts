import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
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
    expect(patch.useOfficialLogo).toBe(true);
    expect(patch.officialLogoVariant).toBe("lockup");
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
});
