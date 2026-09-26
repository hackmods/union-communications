import { getUnionPreset } from "@/lib/constants/unionPresets";
import { getTenantByUnionId } from "@/lib/tenant/loader";

/**
 * Trusted Comms preset ids only — never treat an arbitrary slug as a theme.
 */
export function isTrustedUnionPresetId(
  value: string | null | undefined,
): value is string {
  const id = value?.trim();
  return Boolean(id && getUnionPreset(id));
}

/**
 * Resolve a Comms Brand Kit `unionPresetId` for a Hub `unionId`.
 *
 * Precedence:
 * 1. Explicit binding (`boundPresetId` or seed `brandDefaults.commsPresetId`)
 * 2. Tenant slug when it matches a trusted `UNION_PRESETS` id
 * 3. `null` — keep platform chrome; steward picks manually
 *
 * Does not write Hub tenancy. Brand Kit never drives `users.unionId`.
 */
export function resolvePresetIdFromUnionId(
  unionId: string | null | undefined,
  options?: { boundPresetId?: string | null },
): string | null {
  const id = unionId?.trim();
  if (!id) return null;

  const bound = options?.boundPresetId?.trim();
  if (isTrustedUnionPresetId(bound)) return bound;

  const seed = getTenantByUnionId(id);
  const fromSeed = seed?.brandDefaults?.commsPresetId?.trim();
  if (isTrustedUnionPresetId(fromSeed)) return fromSeed;

  const slug = seed?.union.slug?.trim();
  if (isTrustedUnionPresetId(slug)) return slug;

  return null;
}

/** Resolve a preset id from a raw slug or binding string (host / invite). */
export function resolveTrustedPresetId(
  value: string | null | undefined,
): string | null {
  return isTrustedUnionPresetId(value) ? value.trim() : null;
}
