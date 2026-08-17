export const HERO_PREVIEW_VARIANTS = [
  "boardNotice",
  "graphicMaker",
  "flyerMaker",
] as const;

export type HeroPreviewVariant = (typeof HERO_PREVIEW_VARIANTS)[number];

export const HERO_PREVIEW_HREF: Record<HeroPreviewVariant, string> = {
  boardNotice: "/tools/board-notice",
  graphicMaker: "/tools/graphic-maker",
  flyerMaker: "/tools/flyer-maker",
};

export function pickHeroPreviewVariant(): HeroPreviewVariant {
  const index = Math.floor(Math.random() * HERO_PREVIEW_VARIANTS.length);
  return HERO_PREVIEW_VARIANTS[index] ?? "boardNotice";
}
