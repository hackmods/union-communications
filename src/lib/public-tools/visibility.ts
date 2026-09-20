import { TOOL_SLUGS } from "@/lib/seo/tool-meta";

/** Hub-gated authoring — not part of public tool gate checklist. */
export const NON_GATEABLE_TOOL_SLUGS = new Set(["pulse-poll"]);

/** Public Comms tools that Site Admin can enable/disable. */
export const GATEABLE_PUBLIC_TOOL_SLUGS: readonly string[] = TOOL_SLUGS.filter(
  (slug) => !NON_GATEABLE_TOOL_SLUGS.has(slug),
);

export type PublicToolSettingsRecord = {
  disabledToolSlugs: string[];
  updatedById: string;
  updatedAt: string;
};

export type PublicToolResolveContext = {
  unionId?: string | null;
  localId?: string | null;
};

/**
 * Resolve whether a public tool slug is enabled.
 * Platform kill-switch wins, then union overlay, then local overlay.
 * Defaults: everything on (empty disabled lists).
 */
export function resolvePublicToolEnabled(
  slug: string,
  layers: {
    platformDisabled: readonly string[];
    unionDisabled?: readonly string[];
    localDisabled?: readonly string[];
  },
): boolean {
  if (NON_GATEABLE_TOOL_SLUGS.has(slug)) return true;
  if (layers.platformDisabled.includes(slug)) return false;
  if (layers.unionDisabled?.includes(slug)) return false;
  if (layers.localDisabled?.includes(slug)) return false;
  return true;
}

export function slugFromToolHref(href: string): string | null {
  const match = href.match(/^\/tools\/([^/?#]+)/);
  return match?.[1] ?? null;
}
