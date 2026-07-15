/**
 * Shared public/hub content shells. Chrome (header/footer) stays widest;
 * page bodies pick a tier so home ≠ “stray wider canvas” than tools/guides.
 *
 * @see .cursor/rules/responsive-layouts.mdc
 */
export const PAGE_SHELL = {
  /** Header, footer, hub nav — app chrome frame only */
  chrome: "mx-auto max-w-7xl px-4",
  /** Home, examples, multi-panel tools — default wide content */
  wide: "mx-auto max-w-5xl px-4",
  /** Guides, privacy, long-form reading */
  read: "mx-auto max-w-3xl px-4",
  /** Brand kit, manifesto, forms, focused single-column */
  focus: "mx-auto max-w-2xl px-4",
} as const;

export type PageShellSize = keyof typeof PAGE_SHELL;
