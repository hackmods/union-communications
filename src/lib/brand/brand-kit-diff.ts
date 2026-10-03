import { normalizeBrandKit } from "@/lib/utils/local-links";
import type { BrandKit } from "@/types/entities";

const COMPARE_KEYS = [
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "unionPresetId",
  "identityPackId",
  "useOfficialLogo",
  "customLogoDataUrl",
  "officialLogoVariant",
  "signatureName",
  "signatureTitle",
] as const satisfies readonly (keyof BrandKit)[];

/**
 * True when the browser kit differs from the Hub-resolved kit in steward-facing
 * fields (colours, logo, preset, signature, local number). Used to decide
 * one-time browser → personal overlay promotion on login.
 */
export function brandKitsMeaningfullyDiffer(
  a: BrandKit | null | undefined,
  b: BrandKit | null | undefined,
): boolean {
  if (!a || !b) return Boolean(a) !== Boolean(b);
  const left = normalizeBrandKit(a);
  const right = normalizeBrandKit(b);
  for (const key of COMPARE_KEYS) {
    if (left[key] !== right[key]) return true;
  }
  if (left.local.localNumber !== right.local.localNumber) return true;
  if (left.local.subText !== right.local.subText) return true;
  return false;
}
