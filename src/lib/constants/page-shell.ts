/**
 * Shared public/hub content shells. Chrome (header/footer) stays widest;
 * page bodies pick a tier so home ≠ “stray wider canvas” than tools/guides.
 *
 * Desktop canvases (~90–100rem) use large screens; read/focus stay narrow
 * for prose measure and auth forms.
 *
 * @see .cursor/rules/responsive-layouts.mdc
 */
export const PAGE_SHELL = {
  /** Header, footer, hub nav — app chrome frame only */
  chrome: "mx-auto max-w-[100rem] px-4 sm:px-6 xl:px-8",
  /** Home, examples, multi-panel tools / workspaces — default wide content */
  wide: "mx-auto max-w-[90rem] px-4 sm:px-6 xl:px-8",
  /** Guides, privacy, long-form reading */
  read: "mx-auto max-w-3xl px-4 sm:px-6",
  /** Manifesto, auth-adjacent forms, focused single-column */
  focus: "mx-auto max-w-2xl px-4 sm:px-6",
} as const;

export type PageShellSize = keyof typeof PAGE_SHELL;
