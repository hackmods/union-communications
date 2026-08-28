import type { PageShellSize } from "@/lib/constants/page-shell";

/**
 * Area-specific layout patterns — shell width (PAGE_SHELL) is separate from
 * how content fills that shell. Pick a composition per surface; do not assume
 * one pattern for all guides or tools.
 *
 * @see .cursor/rules/responsive-layouts.mdc
 * @see src/components/layout/ComposedPageLayout.tsx
 */
export type PageComposition =
  /** Single column — pamphlet, legal, channel guides, manifesto-adjacent */
  | "narrow"
  /** lg+ left sticky rail (TOC, start-here, tool nav) + main column */
  | "sidebar-left"
  /** lg+ right sticky rail (preview-adjacent notes, help) + main column */
  | "sidebar-right"
  /** Full catalog / index — multi-column grids inside wide shell */
  | "hub"
  /** Canvas / workspace — paired panels (Brand Kit, ToolEditorLayout) */
  | "workspace";

/** Guide-specific presets — maps to PageComposition + default shell */
export const GUIDE_COMPOSITION = {
  /** Channel-tier, privacy reuse — max-w-3xl, no rail */
  narrow: { composition: "narrow" as const, shell: "read" as const },
  /** Playbook chapters — readWide frame + optional TOC rail @ lg+ */
  playbook: { composition: "sidebar-left" as const, shell: "readWide" as const },
  /** /guide index, resources hub */
  hub: { composition: "hub" as const, shell: "wide" as const },
} as const;

export type GuideCompositionPreset = keyof typeof GUIDE_COMPOSITION;

/** Tool/catalog presets — canvas tools stay on ToolEditorLayout (workspace) */
export const TOOL_COMPOSITION = {
  /** /tools index — wide + start-here sidebar (custom page layout) */
  catalog: { composition: "sidebar-left" as const, shell: "wide" as const },
  /** ToolEditorLayout — editor + sticky preview */
  editor: { composition: "workspace" as const, shell: "wide" as const },
  /** document-generator, alt-text — intentional exceptions */
  custom: { composition: "workspace" as const, shell: "wide" as const },
} as const;

/**
 * Resolve shell tier when a page passes composition without explicit size.
 */
export function shellForComposition(
  composition: PageComposition,
  explicit?: PageShellSize,
): PageShellSize {
  if (explicit) return explicit;
  switch (composition) {
    case "narrow":
      return "read";
    case "sidebar-left":
    case "sidebar-right":
      return "readWide";
    case "hub":
    case "workspace":
      return "wide";
    default:
      return "read";
  }
}

/**
 * Whether lg+ should render a sticky rail from rail content.
 */
export function usesDesktopRail(
  composition: PageComposition,
  rail?: unknown,
): boolean {
  if (!rail) return false;
  return composition === "sidebar-left" || composition === "sidebar-right";
}
