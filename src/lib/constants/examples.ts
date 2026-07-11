import type { ToolPresetKey } from "@/lib/constants/presets";

export type ExampleCategory =
  | "strike"
  | "spotlight"
  | "agm"
  | "bargaining"
  | "events";

export type ExampleLayout =
  | "solidarity"
  | "spotlight"
  | "notice"
  | "quote"
  | "results"
  | "thanks";

export type ExamplePrimaryTool =
  | "graphic-maker"
  | "quote-card"
  | "flyer-maker";

export type ExamplePlatform = "facebook" | "instagram" | "both";

export type ExampleAspect = "landscape" | "square";

export interface ExamplePost {
  id: string;
  category: ExampleCategory;
  platform: ExamplePlatform;
  layout: ExampleLayout;
  aspect: ExampleAspect;
  /** Graphic Maker preset to preload via ?preset= (legacy fallback) */
  presetKey?: ToolPresetKey;
  /** Captions template id to highlight via ?caption= */
  captionId?: string;
  primaryTool: ExamplePrimaryTool;
}

export const EXAMPLE_CATEGORIES: ExampleCategory[] = [
  "strike",
  "spotlight",
  "agm",
  "bargaining",
  "events",
];

export const EXAMPLE_POSTS: ExamplePost[] = [
  {
    id: "picket-solidarity",
    category: "strike",
    platform: "both",
    layout: "solidarity",
    aspect: "landscape",
    presetKey: "strikeAction",
    captionId: "strike",
    primaryTool: "graphic-maker",
  },
  {
    id: "strike-vote-results",
    category: "strike",
    platform: "both",
    layout: "results",
    aspect: "square",
    presetKey: "strikeAction",
    captionId: "strike",
    primaryTool: "graphic-maker",
  },
  {
    id: "picket-flyer",
    category: "strike",
    platform: "facebook",
    layout: "solidarity",
    aspect: "landscape",
    captionId: "strike",
    primaryTool: "flyer-maker",
  },
  {
    id: "member-spotlight",
    category: "spotlight",
    platform: "instagram",
    layout: "spotlight",
    aspect: "square",
    presetKey: "memberSpotlight",
    captionId: "spotlight",
    primaryTool: "graphic-maker",
  },
  {
    id: "agm-notice",
    category: "agm",
    platform: "facebook",
    layout: "notice",
    aspect: "landscape",
    presetKey: "agmNotice",
    captionId: "agm",
    primaryTool: "graphic-maker",
  },
  {
    id: "bargaining-update",
    category: "bargaining",
    platform: "both",
    layout: "notice",
    aspect: "landscape",
    presetKey: "bargainingUpdate",
    captionId: "bargaining",
    primaryTool: "graphic-maker",
  },
  {
    id: "bargaining-quote",
    category: "bargaining",
    platform: "instagram",
    layout: "quote",
    aspect: "square",
    captionId: "bargaining",
    primaryTool: "quote-card",
  },
  {
    id: "town-hall-thanks",
    category: "events",
    platform: "facebook",
    layout: "thanks",
    aspect: "landscape",
    captionId: "event-thanks",
    primaryTool: "graphic-maker",
  },
  {
    id: "welcome-members",
    category: "events",
    platform: "both",
    layout: "thanks",
    aspect: "square",
    captionId: "welcome",
    primaryTool: "graphic-maker",
  },
];

export function getExamplePost(id: string): ExamplePost | undefined {
  return EXAMPLE_POSTS.find((p) => p.id === id);
}

export function primaryToolHref(post: ExamplePost): string {
  const q = `example=${encodeURIComponent(post.id)}`;
  if (post.primaryTool === "quote-card") {
    return `/tools/quote-card?${q}`;
  }
  if (post.primaryTool === "flyer-maker") {
    return `/tools/flyer-maker?${q}`;
  }
  return `/tools/graphic-maker?${q}`;
}

export function captionHref(captionId: string): string {
  return `/captions?caption=${captionId}`;
}

/** Layouts where a member photo strengthens the design */
export function layoutSupportsPhoto(
  layout: ExampleLayout,
): layout is "solidarity" | "spotlight" | "thanks" {
  return layout === "solidarity" || layout === "spotlight" || layout === "thanks";
}
