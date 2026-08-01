/**
 * Shared public/hub content shells. Chrome (header/footer) stays widest;
 * page bodies pick a tier so home ≠ “stray wider canvas” than tools/guides.
 *
 * Desktop canvases (~90–100rem) use large screens; read/focus stay narrow
 * for prose measure and auth forms. Nested Hub tiers omit horizontal padding
 * because `/app` layout already applies `wide` padding.
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
  /** Manifesto, public auth-adjacent forms, focused single-column */
  focus: "mx-auto max-w-2xl px-4 sm:px-6",
  /** Hub forms inside `wide` layout — no extra horizontal padding */
  nestedFocus: "mx-auto w-full max-w-2xl",
  /** Hub login / MFA inside `wide` layout */
  nestedAuth: "mx-auto w-full max-w-md",
  /** Hub profile inside `wide` layout */
  nestedProfile: "mx-auto w-full max-w-lg",
} as const;

export type PageShellSize = keyof typeof PAGE_SHELL;
