/**
 * Worksheet tool slugs (practical workspaces). Canonical public URLs live under
 * `/utilities/:slug` (nav label: Worksheets); Create makers stay under `/create/:slug`.
 *
 * Kept in `src/lib/seo` (not under components) so `next.config.ts` →
 * `public-routes.ts` can import without relying on the `@/` alias, which
 * Next's config transpile does not resolve for nested modules.
 *
 * Makers that used to live here (pulse-poll, local-pack, resizer, alt-text)
 * remain on Create — see `MOVED_TO_CREATE_TOOL_SLUGS` for legacy `/utilities`
 * redirects.
 */
export const UTILITY_TOOL_SLUGS = [
  "rtw-accommodation",
  "grievance-form-builder",
  "ca-snippets",
  "steward-quick-log",
  "pre-disciplinary-log",
  "complaint-vs-grievance",
  "bylaw-builder",
  "proposal-tracker",
  "rules-of-order",
] as const;

/** Former utility makers now canonical under `/create/:slug`. */
export const MOVED_TO_CREATE_TOOL_SLUGS = [
  "pulse-poll",
  "local-pack",
  "resizer",
  "alt-text",
] as const;

export type UtilityToolSlug = (typeof UTILITY_TOOL_SLUGS)[number];

export const UTILITY_TOOL_SLUG_SET: ReadonlySet<string> = new Set(
  UTILITY_TOOL_SLUGS,
);

export const MOVED_TO_CREATE_TOOL_SLUG_SET: ReadonlySet<string> = new Set(
  MOVED_TO_CREATE_TOOL_SLUGS,
);

/** Product surface for public tool discovery (Create vs Worksheets). */
export type ToolSurface = "create" | "utilities";

export function toolSurfaceForSlug(slug: string): ToolSurface {
  return UTILITY_TOOL_SLUG_SET.has(slug) ? "utilities" : "create";
}
