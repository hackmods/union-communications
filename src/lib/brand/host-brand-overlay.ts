import {
  resolveHostBrandDefaults,
  type HostBrandDefaults,
} from "@/lib/constants/host-brand";

/** In-process host-brand overlay (memory + after Postgres hydrate). Client-safe. */
let hostBrandOverlay: Partial<HostBrandDefaults> | null = null;

export function getHostBrandOverlay(): Partial<HostBrandDefaults> | null {
  return hostBrandOverlay;
}

export function setHostBrandOverlay(
  patch: Partial<HostBrandDefaults> | null,
): void {
  hostBrandOverlay = patch;
}

/** @internal tests */
export function resetHostBrandOverlayForTests(): void {
  hostBrandOverlay = null;
}

/**
 * Resolve instance defaults with durable overlay.
 * Precedence: env → overlay (DB/admin) → host-brand.json → platform orange.
 * Client-safe — no DB imports.
 */
export function resolveHostBrandWithOverlay(
  file?: Partial<HostBrandDefaults>,
): HostBrandDefaults {
  const base = resolveHostBrandDefaults(file);
  const overlay = hostBrandOverlay;
  if (!overlay) return base;

  const envPrimary = process.env.NEXT_PUBLIC_BRAND_PRIMARY?.trim();
  const envSecondary = process.env.NEXT_PUBLIC_BRAND_SECONDARY?.trim();
  const envAccent = process.env.NEXT_PUBLIC_BRAND_ACCENT?.trim();
  const envLocal = process.env.NEXT_PUBLIC_DEFAULT_LOCAL_NUMBER?.trim();
  const envSub = process.env.NEXT_PUBLIC_DEFAULT_SUB_TEXT?.trim();
  const envDivision = process.env.NEXT_PUBLIC_DEFAULT_DIVISION_ID?.trim();
  const envPreset = process.env.NEXT_PUBLIC_BRAND_UNION_PRESET?.trim();

  return {
    primaryColor: envPrimary
      ? base.primaryColor
      : (overlay.primaryColor ?? base.primaryColor),
    secondaryColor: envSecondary
      ? base.secondaryColor
      : (overlay.secondaryColor ?? base.secondaryColor),
    accentColor: envAccent
      ? base.accentColor
      : (overlay.accentColor ?? base.accentColor),
    localNumber: envLocal
      ? base.localNumber
      : (overlay.localNumber ?? base.localNumber),
    subText: envSub ? base.subText : (overlay.subText ?? base.subText),
    ...(envDivision
      ? base.divisionId
        ? { divisionId: base.divisionId }
        : {}
      : overlay.divisionId
        ? { divisionId: overlay.divisionId }
        : base.divisionId
          ? { divisionId: base.divisionId }
          : {}),
    ...(envPreset
      ? base.unionPresetId
        ? { unionPresetId: base.unionPresetId }
        : {}
      : overlay.unionPresetId
        ? { unionPresetId: overlay.unionPresetId }
        : base.unionPresetId
          ? { unionPresetId: base.unionPresetId }
          : {}),
  };
}
