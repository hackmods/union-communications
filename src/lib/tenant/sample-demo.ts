/**
 * Demo / sample Hub tenants that should never be mistaken for a real local
 * in invite pickers (B7P CapRover-flavoured seed: 777 / 404 / 502 / 1337).
 */
export const SAMPLE_DEMO_UNION_IDS = new Set(["union-b7p"]);
export const SAMPLE_DEMO_UNION_SLUGS = new Set(["b7p"]);

export function isSampleDemoUnion(union: {
  id?: string | null;
  slug?: string | null;
}): boolean {
  if (union.id && SAMPLE_DEMO_UNION_IDS.has(union.id)) return true;
  if (union.slug && SAMPLE_DEMO_UNION_SLUGS.has(union.slug)) return true;
  return false;
}

export function isSampleDemoLocal(input: {
  unionId?: string | null;
  unionSlug?: string | null;
  isDemo?: boolean | null;
}): boolean {
  if (input.isDemo === true) return true;
  return isSampleDemoUnion({ id: input.unionId, slug: input.unionSlug });
}
