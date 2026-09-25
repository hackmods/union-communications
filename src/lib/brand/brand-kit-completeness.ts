import type { BrandKit } from "@/types/entities";

export type BrandKitCompletenessItemId =
  | "localNumber"
  | "colours"
  | "logo"
  | "links"
  | "canvas"
  | "signature";

export type BrandKitCompletenessItem = {
  id: BrandKitCompletenessItemId;
  done: boolean;
  weight: number;
};

export type BrandKitCompleteness = {
  percent: number;
  items: BrandKitCompletenessItem[];
  missing: BrandKitCompletenessItemId[];
  essentialReady: boolean;
  essentialMissing: BrandKitCompletenessItemId[];
  optionalConfigured: number;
};

const ESSENTIAL_ITEMS: readonly BrandKitCompletenessItemId[] = [
  "localNumber",
  "colours",
  "logo",
];

function hasLogo(kit: BrandKit): boolean {
  if (kit.useOfficialLogo) return true;
  if (kit.customLogoDataUrl?.trim()) return true;
  if (kit.logoText?.trim()) return true;
  return false;
}

function hasLinks(kit: BrandKit): boolean {
  if (kit.websiteUrl?.trim()) return true;
  if (kit.facebookUrl?.trim()) return true;
  if ((kit.customLinks?.length ?? 0) > 0) return true;
  if ((kit.membershipUrls?.length ?? 0) > 0) return true;
  return false;
}

function hasColours(kit: BrandKit): boolean {
  return Boolean(
    kit.primaryColor?.trim() &&
      kit.secondaryColor?.trim() &&
      kit.accentColor?.trim(),
  );
}

function hasCanvas(kit: BrandKit): boolean {
  return Boolean(kit.canvas && Object.keys(kit.canvas).length > 0);
}

/**
 * Steward-facing Brand Kit progress. Weights favour identity (local + logo)
 * over optional canvas polish and signature defaults.
 */
export function measureBrandKitCompleteness(
  brandKit: BrandKit,
): BrandKitCompleteness {
  const items: BrandKitCompletenessItem[] = [
    {
      id: "localNumber",
      done: Boolean(brandKit.local.localNumber?.trim()),
      weight: 20,
    },
    {
      id: "colours",
      done: hasColours(brandKit),
      weight: 20,
    },
    {
      id: "logo",
      done: hasLogo(brandKit),
      weight: 25,
    },
    {
      id: "links",
      done: hasLinks(brandKit),
      weight: 15,
    },
    {
      id: "canvas",
      done: hasCanvas(brandKit),
      weight: 10,
    },
    {
      id: "signature",
      done: Boolean(brandKit.signatureName?.trim()),
      weight: 10,
    },
  ];

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const earned = items
    .filter((item) => item.done)
    .reduce((sum, item) => sum + item.weight, 0);
  const percent = Math.round((earned / totalWeight) * 100);
  const missing = items.filter((item) => !item.done).map((item) => item.id);
  const essentialMissing = missing.filter((id) => ESSENTIAL_ITEMS.includes(id));

  return {
    percent,
    items,
    missing,
    essentialReady: essentialMissing.length === 0,
    essentialMissing,
    optionalConfigured: items.filter(
      (item) => item.done && !ESSENTIAL_ITEMS.includes(item.id),
    ).length,
  };
}
