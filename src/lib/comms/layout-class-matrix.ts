/**
 * Layout-class e2e ids — unique geometries, not every preset copy variant.
 * Playwright imports this; Vitest asserts each id exists in the source constant.
 */

export const LAYOUT_CLASS_QR_BOARD = [
  { id: "membershipFtPt", slots: 2, minImgPx: 72 },
  { id: "twoCampaigns", slots: 2, minImgPx: 72 },
  { id: "coreLinks", slots: 4, minImgPx: 64 },
  { id: "fullBoard", slots: 6, minImgPx: 48 },
] as const;

export const LAYOUT_CLASS_QR_CARD = ["getSupport", "rightToRefuse"] as const;

export const LAYOUT_CLASS_ACTION_CARD = ["signPetition"] as const;

export const LAYOUT_CLASS_FLYER = [
  "picket",
  "rally",
  "meeting",
  "walkabout",
] as const;

export const LAYOUT_CLASS_GRAPHIC = [
  "agmNotice",
  "bargainingUpdate",
  "strikeAction",
  "memberSpotlight",
] as const;

export const LAYOUT_CLASS_GRAPHIC_LAYOUT: Record<
  (typeof LAYOUT_CLASS_GRAPHIC)[number],
  "notice" | "solidarity" | "spotlight"
> = {
  agmNotice: "notice",
  bargainingUpdate: "notice",
  strikeAction: "solidarity",
  memberSpotlight: "spotlight",
};

export const LAYOUT_CLASS_SOLIDARITY = [
  { id: "solidarity-forever", layout: "stack" },
  { id: "united-bargain", layout: "split" },
  { id: "organize", layout: "banner" },
] as const;

/** Bold lower-third via deep link; tests then switch Design → Minimal (footer). */
export const LAYOUT_CLASS_MEETING = "solidarity-forever";

/** Unique Quote Card geometries via `?preset=` (stripe / mark / centered). */
export const LAYOUT_CLASS_QUOTE = [
  "bargaining",
  "solidarity",
  "member",
] as const;
