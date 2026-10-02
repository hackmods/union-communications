/**
 * Opt-in empty-Local seed from published `brand:baseline`.
 * Default off — never overwrites an existing local shared or personal kit.
 */

import { brandBaselineToPatch } from "@/lib/customization/brand-baseline";
import type { BrandKitPatch } from "@/types/entities";

export function isBrandBaselineAutoSeedEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.BRAND_BASELINE_AUTO_SEED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * Best-effort baseline patch for empty local seed.
 * Returns null when disabled or when no published baseline is available in-process.
 * Full customization delivery is optional — seed still works from union preset/theme.
 */
export function trySeedBrandBaselinePatch(
  _ctx: { unionId?: string; localId?: string },
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): BrandKitPatch | null {
  if (!isBrandBaselineAutoSeedEnabled(env)) return null;

  // Hook point for customization delivery. Unit tests inject via
  // `__setBaselineSeedPatchForTests`. Production can later resolve
  // AuthorizedBrandDto for the session's presentation scope.
  if (testBaselinePatch) {
    return brandBaselineToPatch({
      key: "brand:baseline",
      locale: "en",
      payload: testBaselinePatch,
    });
  }
  return null;
}

let testBaselinePatch: {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headlineFontId?: string;
  bodyFontId?: string;
} | null = null;

/** @internal */
export function __setBaselineSeedPatchForTests(
  payload: typeof testBaselinePatch,
): void {
  testBaselinePatch = payload;
}

/** @internal */
export function resetBaselineEmptySeedForTests(): void {
  testBaselinePatch = null;
}
