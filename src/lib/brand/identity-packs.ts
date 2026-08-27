/**
 * Brand Kit identity packs — collective Look (colours + official logos).
 * Separate from collection profiles (who you speak as). Data-driven; no
 * CAAT-S if/else in LogoSettings / BrandLogo.
 *
 * Growth rule:
 * - Distinct brand systems → new IdentityPack rows (Looks).
 * - Field treatments of one system → named plates; Look gallery emits one
 *   card per plate so stewards pick in one click.
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

export const CAAT_S_CORAL_PLATE_ID = "coral";
export const CAAT_S_GOLD_PLATE_ID = "gold";

export type IdentityLogoVariant = "lockup" | "mark";

/**
 * Campaign plate id for Looks that ship more than one official colour field.
 * CAAT-S uses `coral` / `gold`. Legacy kits may still store `primary` / `accent`.
 */
export type CampaignPlate = string;

/** Preview plate behind a downloadable asset on /assets */
export type IdentityAssetPlate =
  | "transparent"
  | "primary"
  | "accent"
  | "dark"
  | "light";

/**
 * Downloadable / campaign colour treatments for a Look.
 * Future event packs add rows here — UI reads the catalog, no new if/else.
 */
export type IdentityAssetVariant = {
  id: string;
  src: string;
  plate: IdentityAssetPlate;
  /** When set, overrides pack colour for the preview plate */
  plateColor?: string;
  downloadName: string;
  /** Key under `assets.variantLabels.*` */
  labelKey: string;
};

export type IdentityPackColors = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

/**
 * Named field treatment inside one Look. Explicit colours — never inferred
 * by swapping primary↔accent. Gallery shows one card per plate when length > 1.
 */
export type IdentityCampaignPlate = {
  id: string;
  /** Key under `brandKit.identityPack.plates.*` */
  labelKey: string;
  colors: IdentityPackColors;
  /** Knockout / reverse lockup for fills in this plate’s primary colour */
  lockupOnPlate?: string;
  default?: boolean;
};

export type IdentityPackLogos = {
  /** Colour lockup for light plates */
  lockup: string;
  /**
   * Default knockout when the pack has no named plates (or as fallback).
   * Multi-plate Looks prefer each plate’s `lockupOnPlate`.
   */
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
  /**
   * Base / default colours (also used for /assets preview of primary|accent
   * swatches). Multi-plate Looks still list explicit colours on each plate.
   */
  colors: IdentityPackColors;
  logos: IdentityPackLogos;
  /**
   * Named campaign plates. When more than one, Brand Kit Look gallery emits
   * one card per plate. Omit for single-palette packs.
   */
  plates?: IdentityCampaignPlate[];
  selectableVariants: IdentityLogoVariant[];
  defaultVariant: IdentityLogoVariant;
  /**
   * Full set of colour / plate treatments for Brand Assets downloads.
   * Campaign and event packs ship the same shape.
   */
  assetVariants: IdentityAssetVariant[];
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

export const CAAT_S_GOLD_COLORS: IdentityPackColors = {
  primaryColor: CAAT_S_COLORS.accentColor,
  secondaryColor: CAAT_S_COLORS.secondaryColor,
  accentColor: CAAT_S_COLORS.primaryColor,
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
    assetVariants: [
      {
        id: "lockup",
        src: OPSEU_NATIONAL_LOCKUP,
        plate: "light",
        downloadName: "opseu-logo-primary.png",
        labelKey: "lockup",
      },
      {
        id: "mark",
        src: OPSEU_NATIONAL_MARK,
        plate: "light",
        downloadName: "opseu-logo-mark.png",
        labelKey: "mark",
      },
      {
        id: "mark-on-dark",
        src: OPSEU_NATIONAL_MARK_ON_DARK,
        plate: "primary",
        downloadName: "opseu-logo-mark-white.png",
        labelKey: "markOnDark",
      },
    ],
  },
  {
    id: OPSEU_CAAT_S_PACK_ID,
    unionPresetId: "opseu",
    sectorIds: ["caat-support"],
    colors: CAAT_S_COLORS,
    logos: {
      lockup: "/assets/caat-s/logo-lockup-color.svg",
      lockupOnDark: "/assets/caat-s/logo-lockup-on-primary-knockout.svg",
      oneColor: "/assets/caat-s/logo-lockup-one-color.svg",
    },
    plates: [
      {
        id: CAAT_S_CORAL_PLATE_ID,
        labelKey: "coral",
        colors: CAAT_S_COLORS,
        lockupOnPlate: "/assets/caat-s/logo-lockup-on-primary-knockout.svg",
        default: true,
      },
      {
        id: CAAT_S_GOLD_PLATE_ID,
        labelKey: "gold",
        colors: CAAT_S_GOLD_COLORS,
        lockupOnPlate: "/assets/caat-s/logo-lockup-on-gold.svg",
      },
    ],
    selectableVariants: ["lockup"],
    defaultVariant: "lockup",
    assetVariants: [
      {
        id: "color",
        src: "/assets/caat-s/logo-lockup-color.svg",
        plate: "dark",
        downloadName: "caat-s-bilingual-01-color.svg",
        labelKey: "color",
      },
      {
        id: "on-primary",
        src: "/assets/caat-s/logo-lockup-on-primary.svg",
        plate: "primary",
        downloadName: "caat-s-bilingual-02-on-coral.svg",
        labelKey: "onPrimary",
      },
      {
        id: "knockout",
        src: "/assets/caat-s/logo-lockup-on-primary-knockout.svg",
        plate: "primary",
        downloadName: "caat-s-bilingual-02-knockout.svg",
        labelKey: "knockout",
      },
      {
        id: "on-gold",
        src: "/assets/caat-s/logo-lockup-on-gold.svg",
        plate: "accent",
        downloadName: "caat-s-bilingual-03-on-gold.svg",
        labelKey: "onGold",
      },
      {
        id: "one-color",
        src: "/assets/caat-s/logo-lockup-one-color.svg",
        plate: "dark",
        downloadName: "caat-s-bilingual-04-one-color.svg",
        labelKey: "oneColor",
      },
      {
        id: "reverse",
        src: "/assets/caat-s/logo-lockup-reverse.svg",
        plate: "dark",
        downloadName: "caat-s-bilingual-06-reverse.svg",
        labelKey: "reverse",
      },
    ],
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

/** Gallery tile: one Look card, optionally bound to a named plate. */
export type IdentityPackGalleryTile = {
  pack: IdentityPack;
  plate: IdentityCampaignPlate | null;
  /** Stable key for React / radio identity */
  key: string;
};

/**
 * Expand offered packs into Look-gallery tiles. Multi-plate Looks become one
 * card per plate; single-palette Looks stay one card.
 */
export function identityPackGalleryTiles(
  packs: readonly IdentityPack[],
): IdentityPackGalleryTile[] {
  const tiles: IdentityPackGalleryTile[] = [];
  for (const pack of packs) {
    if (packOffersCampaignPlates(pack)) {
      for (const plate of pack.plates) {
        tiles.push({
          pack,
          plate,
          key: `${pack.id}:${plate.id}`,
        });
      }
    } else {
      tiles.push({ pack, plate: null, key: pack.id });
    }
  }
  return tiles;
}

export function packPlates(
  pack: IdentityPack | undefined,
): IdentityCampaignPlate[] {
  if (!pack?.plates?.length) return [];
  return [...pack.plates];
}

export function packOffersCampaignPlates(
  pack: IdentityPack | undefined,
): pack is IdentityPack & { plates: IdentityCampaignPlate[] } {
  return Boolean(pack?.plates && pack.plates.length > 1);
}

export function defaultCampaignPlate(
  pack: IdentityPack | undefined,
): IdentityCampaignPlate | undefined {
  const plates = packPlates(pack);
  if (!plates.length) return undefined;
  return plates.find((p) => p.default) ?? plates[0];
}

/**
 * Map legacy `primary` / `accent` ids onto named plates for a pack.
 * `primary` → default plate; `accent` → first non-default (or second) plate.
 */
export function resolveLegacyCampaignPlateId(
  pack: IdentityPack | undefined,
  plate: string | undefined,
): string | undefined {
  if (!plate?.trim()) return undefined;
  const id = plate.trim();
  const plates = packPlates(pack);
  if (!plates.length) return undefined;

  if (plates.some((p) => p.id === id)) return id;

  if (id === "primary") {
    return defaultCampaignPlate(pack)?.id;
  }
  if (id === "accent") {
    const nonDefault = plates.find((p) => !p.default) ?? plates[1];
    return nonDefault?.id ?? defaultCampaignPlate(pack)?.id;
  }
  return undefined;
}

export function coerceCampaignPlate(
  pack: IdentityPack | undefined,
  plate: string | undefined,
): CampaignPlate {
  if (packOffersCampaignPlates(pack)) {
    const resolved = resolveLegacyCampaignPlateId(pack, plate);
    if (resolved) return resolved;
    return defaultCampaignPlate(pack)?.id ?? pack.plates[0]!.id;
  }
  return defaultCampaignPlate(pack)?.id ?? "";
}

export function getCampaignPlate(
  pack: IdentityPack,
  plateId: string | undefined,
): IdentityCampaignPlate | undefined {
  const id = coerceCampaignPlate(pack, plateId);
  return packPlates(pack).find((p) => p.id === id);
}

export function colorsForCampaignPlate(
  pack: IdentityPack,
  plate: CampaignPlate | undefined,
): IdentityPackColors {
  const record = getCampaignPlate(pack, plate);
  if (record) return { ...record.colors };
  return { ...pack.colors };
}

export function lockupOnPlateFor(
  pack: IdentityPack,
  plate: CampaignPlate | undefined,
): string | undefined {
  const record = getCampaignPlate(pack, plate);
  if (record?.lockupOnPlate) return record.lockupOnPlate;
  return pack.logos.lockupOnDark;
}

/**
 * Pick the plate lockup that matches a canvas fill hex — not only the active
 * campaign plate. Multi-colour lockups vanish when gold/coral ink sits on a
 * matching band (Meeting Background bands, side panels, etc.).
 */
export function lockupForCanvasBackground(
  pack: IdentityPack | undefined,
  backgroundColor: string | undefined,
): string | undefined {
  const bg = backgroundColor?.trim().toUpperCase();
  if (!bg || !pack) return undefined;

  if (packOffersCampaignPlates(pack)) {
    for (const plate of pack.plates) {
      if (
        plate.lockupOnPlate &&
        plate.colors.primaryColor.trim().toUpperCase() === bg
      ) {
        return plate.lockupOnPlate;
      }
    }
  }

  if (
    pack.logos.lockupOnDark &&
    pack.colors.primaryColor.trim().toUpperCase() === bg
  ) {
    return pack.logos.lockupOnDark;
  }

  return undefined;
}

export function applyIdentityPack(
  pack: IdentityPack,
  plate?: CampaignPlate,
): BrandKitPatch {
  const resolved = packOffersCampaignPlates(pack)
    ? coerceCampaignPlate(pack, plate)
    : undefined;
  const colors = colorsForCampaignPlate(pack, resolved);
  return {
    identityPackId: pack.id,
    campaignPlate: resolved,
    primaryColor: colors.primaryColor,
    secondaryColor: colors.secondaryColor,
    accentColor: colors.accentColor,
    useOfficialLogo: true,
    officialLogoVariant: pack.defaultVariant,
    // Clear any prior UnionOps / upload path so BrandLogo + picker stay in sync
    customLogoDataUrl: undefined,
  };
}

export function colorsMatchIdentityPack(
  kit: Pick<BrandKit, "primaryColor" | "secondaryColor" | "accentColor">,
  pack: IdentityPack,
): boolean {
  const plates = packOffersCampaignPlates(pack)
    ? pack.plates
    : [
        {
          id: "_base",
          labelKey: "_base",
          colors: pack.colors,
        } satisfies IdentityCampaignPlate,
      ];
  return plates.some((plate) => {
    const colors = plate.colors;
    return (
      kit.primaryColor.toUpperCase() === colors.primaryColor.toUpperCase() &&
      kit.secondaryColor.toUpperCase() === colors.secondaryColor.toUpperCase() &&
      kit.accentColor.toUpperCase() === colors.accentColor.toUpperCase()
    );
  });
}

export function resolveCampaignPlateForKit(
  kit: Pick<BrandKit, "identityPackId" | "campaignPlate" | "primaryColor">,
): CampaignPlate {
  const pack = getIdentityPack(kit.identityPackId);
  if (!packOffersCampaignPlates(pack)) {
    return defaultCampaignPlate(pack)?.id ?? "";
  }

  const fromSaved = resolveLegacyCampaignPlateId(pack, kit.campaignPlate);
  if (fromSaved) return fromSaved;

  // Infer from primary colour when plate id is missing or unknown.
  const match = pack.plates.find(
    (p) =>
      kit.primaryColor?.toUpperCase() === p.colors.primaryColor.toUpperCase(),
  );
  if (match) return match.id;

  return coerceCampaignPlate(pack, kit.campaignPlate);
}

export function normalizeCampaignPlate(
  raw: unknown,
  identityPackId: string | undefined,
): CampaignPlate | undefined {
  const pack = getIdentityPack(identityPackId);
  if (!packOffersCampaignPlates(pack)) return undefined;
  return coerceCampaignPlate(pack, typeof raw === "string" ? raw : undefined);
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
    | "identityPackId"
    | "unionPresetId"
    | "opseuSectorId"
    | "useOfficialLogo"
    | "campaignPlate"
    | "primaryColor"
  >,
): ResolvedOfficialLogos | null {
  const pack = resolveIdentityPackForKit(kit);
  if (!pack) return null;

  const plate = resolveCampaignPlateForKit(kit);
  const lockupOnPlate = lockupOnPlateFor(pack, plate);

  const lockup: ResolvedOfficialLogoAsset = {
    src: pack.logos.lockup,
    srcOnDark: lockupOnPlate,
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

/** Preview fill for an asset variant card. */
export function identityAssetPlateColor(
  pack: IdentityPack,
  variant: IdentityAssetVariant,
): string {
  if (variant.plateColor) return variant.plateColor;
  switch (variant.plate) {
    case "primary":
      return pack.colors.primaryColor;
    case "accent":
      return pack.colors.accentColor;
    case "dark":
      return "#1A1A1A";
    case "light":
    case "transparent":
    default:
      return "#FFFFFF";
  }
}

/** Gaps when a pack ships empty or broken download rows. */
export function identityPackAssetGaps(): string[] {
  const gaps: string[] = [];
  for (const pack of IDENTITY_PACKS) {
    if (!pack.assetVariants.length) {
      gaps.push(`${pack.id}: needs at least one assetVariants row`);
      continue;
    }
    const ids = new Set<string>();
    for (const variant of pack.assetVariants) {
      if (ids.has(variant.id)) {
        gaps.push(`${pack.id}: duplicate asset variant ${variant.id}`);
      }
      ids.add(variant.id);
      if (!variant.src.startsWith("/")) {
        gaps.push(`${pack.id}/${variant.id}: src must be a public path`);
      }
      if (!variant.downloadName.trim()) {
        gaps.push(`${pack.id}/${variant.id}: missing downloadName`);
      }
      if (!variant.labelKey.trim()) {
        gaps.push(`${pack.id}/${variant.id}: missing labelKey`);
      }
    }
    const plateIds = new Set<string>();
    for (const plate of packPlates(pack)) {
      if (plateIds.has(plate.id)) {
        gaps.push(`${pack.id}: duplicate plate id ${plate.id}`);
      }
      plateIds.add(plate.id);
      if (!plate.labelKey.trim()) {
        gaps.push(`${pack.id}/${plate.id}: missing labelKey`);
      }
      if (plate.lockupOnPlate && !plate.lockupOnPlate.startsWith("/")) {
        gaps.push(`${pack.id}/${plate.id}: lockupOnPlate must be a public path`);
      }
    }
    if (packOffersCampaignPlates(pack) && !defaultCampaignPlate(pack)) {
      gaps.push(`${pack.id}: multi-plate Look needs a default plate`);
    }
  }
  return gaps;
}
