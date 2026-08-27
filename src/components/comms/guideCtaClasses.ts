/**
 * Shared CTA chrome for public guide pages.
 * Use on `Link` (or Link > span) — never nest `<Button>` inside `<Link>`.
 */
export const guideCtaClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-opseu-blue px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

export const guideCtaOutlineClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 text-base font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

export const guideCtaGhostClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-base font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

/** Compact CTAs for dense step lists (First week, workshop resources). */
export const guideCtaClassSm =
  "inline-flex min-h-9 items-center justify-center rounded-lg bg-opseu-blue px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

export const guideCtaOutlineClassSm =
  "inline-flex min-h-9 items-center justify-center rounded-lg border-2 border-opseu-blue px-3 py-1.5 text-sm font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

export const guideCtaGhostClassSm =
  "inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

/** Full-width variant for stacked tool cards / reference grids. */
export const guideCtaClassBlock = `${guideCtaClass} w-full`;

export const guideCtaOutlineClassBlock = `${guideCtaOutlineClass} w-full`;
