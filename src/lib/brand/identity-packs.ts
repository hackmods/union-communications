/**
 * Brand Kit identity packs — collective Look (colours + official logos).
 * Separate from collection profiles (who you speak as). Data-driven; no
 * CAAT-S if/else in LogoSettings / BrandLogo.
 *
 * Do not import `@/lib/constants/brand` here — that module loads unionPresets,
 * which imports this catalog (circular).
 */

import type { BrandKit, BrandKitPatch } from "@/types/entities";
import type { OfficialLogoVariant } from "@/lib/constants/brand";
import { isOpseuSectorId } from "@/lib/brand/opseu-sector-catalog";

/** Paths mirror `OFFICIAL_LOGOS` in brand.ts — keep in sync. */
const OPSEU_NATIONAL_LOCKUP = "/assets/caat-opseu/logo-primary.png";
const OPSEU_NATIONAL_MARK = "/assets/caat-opseu/logo-mark.png";
const OPSEU_NATIONAL_MARK_ON_DARK = "/assets/caat-opseu/logo-mark-white.png";
const OPSEU_SLIT_BLUE = "/assets/caat-opseu/opseu-mark-slit-blue.svg";
const OPSEU_SLIT_WHITE = "/assets/caat-opseu/opseu-mark-slit-white.svg";

export const OPSEU_NATIONAL_PACK_ID = "opseu-national";
export const OPSEU_CAAT_S_PACK_ID = "opseu-caat-s";

export type IdentityLogoVariant = "lockup" | "mark";

export type IdentityPackColors = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

export type IdentityPackLogos = {
  /** Colour lockup for light plates */
  lockup: string;
  /** Knockout / reverse for dark or brand-coloured plates */
  lockupOnDark?: string;
  mark?: string;
  markOnDark?: string;
  /** Single-ink treatment (optional download / future variant) */
  oneColor?: string;
};

export type IdentityPack = {
  id: string;
  /** Union preset this pack belongs to */
  unionPresetId: string;
  /**
   * When set, offered only for these OPSEU sectors (and when already saved).
   * Omit to offer for every sector of the union.
   */
  sectorIds?: string[];
  colors: IdentityPackColors;
  logos: IdentityPackLogos;
  selectableVariants: IdentityLogoVariant[];
  defaultVariant: IdentityLogoVariant;
};

/**
 * CAAT-S coral from 2017-05 bilingual-01/02 artboards; gold accent from
 * mortarboard / OPSEU lockup in bilingual-01. Hex lives only in this catalog.
 */
export const CAAT_S_COLORS: IdentityPackColors = {
  primaryColor: "#EA5A4F",
  secondaryColor: "#FFFFFF",
  accentColor: "#FFB837",
};

export const IDENTITY_PACKS: readonly IdentityPack[] = [
  {
    id: OPSEU_NATIONAL_PACK_ID,
    unionPresetId: "opseu",
    colors: {
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
    },
    logos: {
      lockup: OPSEU_NATIONAL_LOCKUP,
      mark: OPSEU_NATIONAL_MARK,
      markOnDark: OPSEU_NATIONAL_MARK_ON_DARK,
    },
    selectableVariants: ["lockup", "mark"],
    defaultVariant: "mark",
  },
  {
    id: OPSEU_CAAT_S_PACK_ID,
    unionPresetId: "opseu",
    sectorIds: ["caat-support"],
    colors: CAAT_S_COLORS,
    logos: {
      lockup: "/assets/caat-s/logo-lockup-color.svg",
      // White + gold knockout from bilingual-02 (no coral plate) for primary fills
      lockupOnDark: "/assets/caat-s/logo-lockup-on-primary-knockout.svg",
      oneColor: "/assets/caat-s/logo-lockup-one-color.svg",
    },
    selectableVariants: ["lockup"],
    defaultVariant: "lockup",
  },
] as const;

const PACK_BY_ID = new Map(IDENTITY_PACKS.map((pack) => [pack.id, pack]));

export function getIdentityPack(id: string | undefined): IdentityPack | undefined {
  if (!id?.trim()) return undefined;
  return PACK_BY_ID.get(id.trim());
}

export function defaultIdentityPackId(unionPresetId: string | undefined): string | undefined {
  if (!unionPresetId?.trim()) return undefined;
  const first = IDENTITY_PACKS.find((pack) => pack.unionPresetId === unionPresetId);
  return first?.id;
}

/**
 * Packs offered in the Look gallery for this union + sector.
 * Always includes `savedPackId` when it still belongs to the same union so a
 * steward who switches sector does not lose a saved Look until they pick again.
 */
export function identityPacksFor(
  unionPresetId: string | undefined,
  sectorId?: string | undefined,
  savedPackId?: string | undefined,
): IdentityPack[] {
  if (!unionPresetId?.trim()) return [];

  const offered = IDENTITY_PACKS.filter((pack) => {
    if (pack.unionPresetId !== unionPresetId) return false;
    if (!pack.sectorIds || pack.sectorIds.length === 0) return true;
    if (sectorId && pack.sectorIds.includes(sectorId)) return true;
    if (savedPackId && pack.id === savedPackId) return true;
    return false;
  });

  return offered;
}

export function applyIdentityPack(pack: IdentityPack): BrandKitPatch {
  return {
    identityPackId: pack.id,
    primaryColor: pack.colors.primaryColor,
    secondaryColor: pack.colors.secondaryColor,
    accentColor: pack.colors.accentColor,
    useOfficialLogo: true,
    officialLogoVariant: pack.defaultVariant,
    customLogoDataUrl: undefined,
  };
}

export function colorsMatchIdentityPack(
  kit: Pick<BrandKit, "primaryColor" | "secondaryColor" | "accentColor">,
  pack: IdentityPack,
): boolean {
  return (
    kit.primaryColor.toUpperCase() === pack.colors.primaryColor.toUpperCase() &&
    kit.secondaryColor.toUpperCase() === pack.colors.secondaryColor.toUpperCase() &&
    kit.accentColor.toUpperCase() === pack.colors.accentColor.toUpperCase()
  );
}

/**
 * Resolve which pack drives official logos for this kit.
 * Missing id + OPSEU + official logo → national (no colour rewrite).
 */
export function resolveIdentityPackForKit(
  kit: Pick<
    BrandKit,
    "identityPackId" | "unionPresetId" | "opseuSectorId" | "useOfficialLogo"
  >,
): IdentityPack | undefined {
  const saved = getIdentityPack(kit.identityPackId);
  if (saved) return saved;

  if (kit.unionPresetId === "opseu" && kit.useOfficialLogo) {
    return getIdentityPack(OPSEU_NATIONAL_PACK_ID);
  }

  const defaultId = defaultIdentityPackId(kit.unionPresetId);
  return getIdentityPack(defaultId);
}

export type ResolvedOfficialLogoAsset = {
  src: string;
  srcOnDark?: string;
  aspect: "wide" | "square";
  selectable: boolean;
  onDark?: boolean;
};

export type ResolvedOfficialLogos = {
  packId: string;
  lockup: ResolvedOfficialLogoAsset;
  mark?: ResolvedOfficialLogoAsset;
  slitBlue?: ResolvedOfficialLogoAsset;
  slitWhite?: ResolvedOfficialLogoAsset;
  selectableVariants: IdentityLogoVariant[];
};

/** Map Brand Kit → official logo assets for the active identity pack. */
export function resolveOfficialLogos(
  kit: Pick<
    BrandKit,
    "identityPackId" | "unionPresetId" | "opseuSectorId" | "useOfficialLogo"
  >,
): ResolvedOfficialLogos | null {
  const pack = resolveIdentityPackForKit(kit);
  if (!pack) return null;

  const lockup: ResolvedOfficialLogoAsset = {
    src: pack.logos.lockup,
    srcOnDark: pack.logos.lockupOnDark,
    aspect: "wide",
    selectable: pack.selectableVariants.includes("lockup"),
  };

  const mark = pack.logos.mark
    ? {
        src: pack.logos.mark,
        srcOnDark: pack.logos.markOnDark,
        aspect: "square" as const,
        selectable: pack.selectableVariants.includes("mark"),
      }
    : undefined;

  const nationalExtras =
    pack.id === OPSEU_NATIONAL_PACK_ID
      ? {
          slitBlue: {
            src: OPSEU_SLIT_BLUE,
            aspect: "square" as const,
            selectable: false,
          },
          slitWhite: {
            src: OPSEU_SLIT_WHITE,
            aspect: "square" as const,
            selectable: false,
            onDark: true as const,
          },
        }
      : {};

  return {
    packId: pack.id,
    lockup,
    mark,
    ...nationalExtras,
    selectableVariants: [...pack.selectableVariants],
  };
}

export function isSelectablePackVariant(
  pack: IdentityPack | ResolvedOfficialLogos | null | undefined,
  variant: string | undefined,
): variant is IdentityLogoVariant {
  if (!pack || !variant) return false;
  return pack.selectableVariants.includes(variant as IdentityLogoVariant);
}

/** Coerce kit variant onto a selectable option for the active pack. */
export function coerceOfficialVariantForPack(
  pack: IdentityPack | ResolvedOfficialLogos | null | undefined,
  variant: OfficialLogoVariant | undefined,
): OfficialLogoVariant {
  if (!pack) return variant === "mark" ? "mark" : "lockup";
  if (variant === "lockup" || variant === "mark") {
    if (isSelectablePackVariant(pack, variant)) return variant;
  }
  if (variant === "slitBlue" || variant === "slitWhite") {
    if ("slitBlue" in pack && pack.slitBlue) return variant;
  }
  const fallback = pack.selectableVariants[0] ?? "lockup";
  return fallback;
}

export function normalizeIdentityPackId(
  raw: unknown,
  unionPresetId: string | undefined,
): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) {
    return undefined;
  }
  const pack = getIdentityPack(raw.trim());
  if (!pack) return undefined;
  if (unionPresetId && pack.unionPresetId !== unionPresetId) return undefined;
  return pack.id;
}

/** Validate sector id filter entries against the OPSEU catalog (tests). */
export function identityPackSectorGaps(): string[] {
  const gaps: string[] = [];
  for (const pack of IDENTITY_PACKS) {
    if (!pack.sectorIds) continue;
    for (const sectorId of pack.sectorIds) {
      if (!isOpseuSectorId(sectorId)) {
        gaps.push(`${pack.id}: unknown sectorId ${sectorId}`);
      }
    }
  }
  return gaps;
}
