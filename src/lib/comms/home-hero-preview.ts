export const HERO_PREVIEW_VARIANTS = [
  "boardNotice",
  "graphicMaker",
  "flyerMaker",
] as const;

export type HeroPreviewVariant = (typeof HERO_PREVIEW_VARIANTS)[number];

export const HERO_PREVIEW_HREF: Record<HeroPreviewVariant, string> = {
  boardNotice: "/create/board-notice",
  graphicMaker: "/create/graphic-maker",
  flyerMaker: "/create/flyer-maker",
};
