import { getTenantByUnionSlug } from "@/lib/tenant/loader";
import type { CustomizationScope } from "@/lib/customization/types";

const systemScope: CustomizationScope = { id: "system", kind: "system", archived: false };

export type PresentationScopeResolution = {
  scopes: CustomizationScope[];
  targetScopeId: string;
  unionId: string | null;
  /** Brand Kit / seed slug that produced this chain, when known. */
  presetId: string | null;
};

/**
 * Build a trusted system→union scope chain from a Brand Kit preset id.
 * Preset ids match tenant union slugs when a seed/overlay exists (e.g. `"opseu"`).
 * Unknown presets stay on system-only presentation (neutral compiled defaults).
 */
export function resolvePresentationScopes(input: {
  presetId?: string | null;
  unionSlug?: string | null;
} = {}): PresentationScopeResolution {
  const slug = (input.unionSlug ?? input.presetId)?.trim() || null;
  if (!slug) {
    return { scopes: [systemScope], targetScopeId: systemScope.id, unionId: null, presetId: null };
  }
  const seed = getTenantByUnionSlug(slug);
  if (!seed) {
    return { scopes: [systemScope], targetScopeId: systemScope.id, unionId: null, presetId: slug };
  }
  const unionScope: CustomizationScope = {
    id: `union-${seed.union.id}`,
    kind: "union",
    unionId: seed.union.id,
    parentScopeId: "system",
    archived: false,
  };
  return {
    scopes: [systemScope, unionScope],
    targetScopeId: unionScope.id,
    unionId: seed.union.id,
    presetId: slug,
  };
}
