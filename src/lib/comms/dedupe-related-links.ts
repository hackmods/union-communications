/**
 * Keep the first occurrence of each href in a related-link chrome list.
 * Body CTAs are not passed through this — chrome lists only.
 */
export function dedupeRelatedByHref<T extends { href: string }>(
  links: readonly T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const link of links) {
    const key = normalizeRelatedHref(link.href);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(link);
  }
  return out;
}

/** Strip query/hash and trailing slash for chrome dedupe. */
export function normalizeRelatedHref(href: string): string {
  const noHash = href.split("#")[0] ?? href;
  const noQuery = noHash.split("?")[0] ?? noHash;
  if (noQuery.length > 1 && noQuery.endsWith("/")) {
    return noQuery.slice(0, -1);
  }
  return noQuery;
}
