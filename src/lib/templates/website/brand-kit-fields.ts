import { GENERIC_COLLECTION_LABEL } from "@/lib/brand/collection-profiles";
import { PROFILE_OTHER_LABEL } from "@/lib/brand/collection-profile-catalog";
import { getUnionPreset } from "@/lib/constants/unionPresets";
import type { BrandKit } from "@/types/entities";
import type { WebsiteNavLink } from "@/types/website-template";

const SKIP_COLLECTION_LABELS = new Set([
  GENERIC_COLLECTION_LABEL.toLowerCase(),
  PROFILE_OTHER_LABEL.toLowerCase(),
]);

/** True for http(s) URLs safe to emit as exported-site hrefs. */
export function isWebsiteHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function toWebsiteNavLinks(
  links: readonly { label: string; url: string }[],
): WebsiteNavLink[] {
  const out: WebsiteNavLink[] = [];
  for (const link of links) {
    const url = link.url.trim();
    const label = link.label.trim();
    if (!label || !isWebsiteHttpUrl(url)) continue;
    out.push({ label, url });
  }
  return out;
}

/**
 * Site title: union preset name + Local N, unless the preset is the generic
 * "Other" catch-all. Brand Kit `unionName` wins when set.
 */
export function websiteDisplayName(
  kit: BrandKit,
  localNumber: string,
): string {
  const fromKit = kit.unionName?.trim();
  const preset = kit.unionPresetId
    ? getUnionPreset(kit.unionPresetId)
    : undefined;
  const union = fromKit || preset?.name?.trim();
  if (!union || union.toLowerCase() === "other") {
    return `Local ${localNumber}`;
  }
  return `${union} Local ${localNumber}`;
}

/**
 * Named collection labels for about-copy seeding. Drops the generic "Local"
 * row and the catalog "Other" stub so CAAT Support Staff is not implied.
 */
export function websiteCollectionLabels(kit: BrandKit): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const profile of kit.profiles ?? []) {
    const label = profile.label.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (SKIP_COLLECTION_LABELS.has(key) || seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
}

export function joinWithConjunction(
  items: string[],
  conjunction: string,
): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) {
    return `${items[0]} ${conjunction} ${items[1]}`;
  }
  const head = items.slice(0, -1).join(", ");
  return `${head}, ${conjunction} ${items[items.length - 1]}`;
}
