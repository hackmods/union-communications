import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import { syncBrandKitProfilesFromLocal } from "@/lib/brand/collection-profiles";
import type { BrandKit, BrandKitPatch } from "@/types/entities";

/** Personal-only fields — always live in the per-user overlay when set. */
export const PERSONAL_BRAND_KEYS = [
  "signatureName",
  "signatureTitle",
  "activeProfileId",
  "contactEmail",
  "contactPhone",
  "contactAddress",
] as const satisfies readonly (keyof BrandKit)[];

export type PersonalBrandKey = (typeof PERSONAL_BRAND_KEYS)[number];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/** Apply a partial Brand Kit patch onto a base kit (shared merge used by Hub resolve). */
export function applyBrandKitOverlay(
  base: BrandKit,
  overlay: BrandKitPatch | null | undefined,
): BrandKit {
  if (!overlay || Object.keys(overlay).length === 0) {
    return normalizeBrandKit(base);
  }
  return syncBrandKitProfilesFromLocal(
    normalizeBrandKit({
      ...base,
      ...overlay,
      local: { ...base.local, ...overlay.local },
      customLinks:
        overlay.customLinks !== undefined
          ? overlay.customLinks
          : base.customLinks,
      membershipUrls:
        overlay.membershipUrls !== undefined
          ? overlay.membershipUrls
          : base.membershipUrls,
      profiles:
        overlay.profiles !== undefined ? overlay.profiles : base.profiles,
      canvas: "canvas" in overlay ? (overlay.canvas ?? undefined) : base.canvas,
      updatedAt: new Date().toISOString(),
    }),
  );
}

/**
 * Merge local shared defaults with a personal overlay.
 * Returns null only when both layers are empty.
 */
export function resolveEffectiveBrandKit(
  localShared: BrandKit | null | undefined,
  personalOverlay: BrandKitPatch | null | undefined,
): BrandKit | null {
  if (!localShared && (!personalOverlay || Object.keys(personalOverlay).length === 0)) {
    return null;
  }
  const base = localShared ?? normalizeBrandKit({ ...DEFAULT_BRAND_KIT });
  return applyBrandKitOverlay(base, personalOverlay);
}

/**
 * Diff submitted effective kit against local shared defaults.
 * When there is no local row yet, the full kit becomes the personal working copy.
 */
export function computePersonalOverlay(
  localShared: BrandKit | null | undefined,
  submitted: BrandKit,
): BrandKitPatch {
  const normalized = normalizeBrandKit(submitted);
  if (!localShared) {
    return { ...normalized };
  }

  const overlay: BrandKitPatch = {};
  const local = normalizeBrandKit(localShared);

  for (const key of Object.keys(normalized) as (keyof BrandKit)[]) {
    if (key === "updatedAt" || key === "version") continue;
    const nextVal = normalized[key];
    const prevVal = local[key];
    if (!valuesEqual(nextVal, prevVal)) {
      (overlay as Record<string, unknown>)[key] = nextVal;
    }
  }

  // Always keep explicit personal keys when present on the submitted kit.
  for (const key of PERSONAL_BRAND_KEYS) {
    const value = normalized[key];
    if (value !== undefined && value !== null && value !== "") {
      (overlay as Record<string, unknown>)[key] = value;
    }
  }

  return overlay;
}

/** Strip empty overlay noise after publishing to Local. */
export function pruneOverlayAgainstLocal(
  localShared: BrandKit,
  overlay: BrandKitPatch | null | undefined,
): BrandKitPatch {
  if (!overlay) return {};
  return computePersonalOverlay(localShared, applyBrandKitOverlay(localShared, overlay));
}

export function overlayHasContent(overlay: BrandKitPatch | null | undefined): boolean {
  if (!overlay) return false;
  return Object.keys(overlay).some((key) => {
    const value = (overlay as Record<string, unknown>)[key];
    if (value === undefined || value === null || value === "") return false;
    if (isPlainObject(value) && Object.keys(value).length === 0) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });
}
