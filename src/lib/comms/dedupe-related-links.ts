/**
 * Keep the first occurrence of each href in a related-link chrome list.
 * Body CTAs are not passed through this — chrome lists only.
 * Emits canonical public paths so /guide/* and /learn/* collapse together.
 */
import { canonicalizePublicHref } from "@/lib/seo/public-routes";

export function dedupeRelatedByHref<T extends { href: string }>(
  links: readonly T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const link of links) {
    const canonicalHref = canonicalizePublicHref(link.href);
    const key = normalizeRelatedHref(canonicalHref);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonicalHref === link.href ? link : { ...link, href: canonicalHref });
  }
  return out;
}

/** Strip query/hash and trailing slash for chrome dedupe (after canonicalization). */
export function normalizeRelatedHref(href: string): string {
  const canonical = canonicalizePublicHref(href);
  const noHash = canonical.split("#")[0] ?? canonical;
  const noQuery = noHash.split("?")[0] ?? noHash;
  if (noQuery.length > 1 && noQuery.endsWith("/")) {
    return noQuery.slice(0, -1);
  }
  return noQuery;
}
