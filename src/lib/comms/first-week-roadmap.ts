/**
 * First week roadmap (`/guide/social-media-plan`) step order.
 * Brand → boards → print → socials → website (print sits after boards).
 */
export const FIRST_WEEK_STEP_KEYS = [
  "logo",
  "boards",
  "print",
  "socials",
  "website",
] as const;

export type FirstWeekStepKey = (typeof FIRST_WEEK_STEP_KEYS)[number];

export const FIRST_WEEK_STEP_LINKS: Record<
  FirstWeekStepKey,
  { primary: string; secondary: string; tertiary?: { href: string; labelKey: string }[] }
> = {
  logo: {
    primary: "/brand-kit",
    secondary: "/tools/logo-builder",
  },
  boards: {
    primary: "/tools/board-notice",
    secondary: "/guide/union-boards",
  },
  print: {
    primary: "/tools/flyer-maker",
    secondary: "/guide/print",
  },
  socials: {
    primary: "/tools/graphic-maker",
    secondary: "/captions",
    tertiary: [
      { href: "/examples", labelKey: "tertiaryExamples" },
      { href: "/guide", labelKey: "tertiaryBlueprint" },
    ],
  },
  website: {
    primary: "/tools/website-template",
    secondary: "/guide/website",
  },
};
