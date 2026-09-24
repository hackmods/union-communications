/**
 * Utility tool slugs (practical workspaces). Canonical public URLs live under
 * `/utilities/:slug`; Create makers stay under `/create/:slug`.
 *
 * Kept in `src/lib/seo` (not under components) so `next.config.ts` →
 * `public-routes.ts` can import without relying on the `@/` alias, which
 * Next's config transpile does not resolve for nested modules.
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
  "local-pack",
  "resizer",
  "alt-text",
  "pulse-poll",
] as const;

export type UtilityToolSlug = (typeof UTILITY_TOOL_SLUGS)[number];

export const UTILITY_TOOL_SLUG_SET: ReadonlySet<string> = new Set(
  UTILITY_TOOL_SLUGS,
);

/** Product surface for public tool discovery (Create vs Utilities). */
export type ToolSurface = "create" | "utilities";

export function toolSurfaceForSlug(slug: string): ToolSurface {
  return UTILITY_TOOL_SLUG_SET.has(slug) ? "utilities" : "create";
}
