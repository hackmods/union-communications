import type { EmojiId } from "@/lib/constants/emoji";
import { emojiChar } from "@/lib/constants/emoji";

export type CaptionTemplateId =
  | "welcome"
  | "agm"
  | "bargaining"
  | "strike"
  | "spotlight"
  | "event-thanks";

export interface CaptionTemplateMeta {
  id: CaptionTemplateId;
  hashtags: string[];
  /** Optional emoji prepended/appended around the i18n caption body. */
  leadEmoji?: EmojiId;
  trailEmoji?: EmojiId;
}

/**
 * Stable ids + union-agnostic hashtags. Category / title / caption bodies live
 * in messages catalogs under captions.templates (COPY-004).
 */
export const CAPTION_TEMPLATES: CaptionTemplateMeta[] = [
  {
    id: "welcome",
    hashtags: ["#LocalUnion", "#UnionStrong", "#NewMember", "#Solidarity"],
  },
  {
    id: "agm",
    leadEmoji: "megaphone",
    hashtags: ["#AGM", "#LocalUnion", "#MemberVoice", "#Democracy"],
  },
  {
    id: "bargaining",
    hashtags: ["#Bargaining", "#FairWages", "#LocalUnion", "#WorkersRights"],
  },
  {
    id: "strike",
    leadEmoji: "warning",
    hashtags: ["#Strike", "#Solidarity", "#LocalUnion", "#UnionStrong"],
  },
  {
    id: "spotlight",
    leadEmoji: "star",
    hashtags: ["#MemberSpotlight", "#LocalUnion", "#UnionFamily"],
  },
  {
    id: "event-thanks",
    trailEmoji: "strength",
    hashtags: ["#ThankYou", "#LocalUnion", "#Community", "#Solidarity"],
  },
];

export function isCaptionTemplateId(value: string): value is CaptionTemplateId {
  return CAPTION_TEMPLATES.some((tpl) => tpl.id === value);
}

/** Compose caption body with optional registry emoji around the translated text. */
export function formatCaptionBody(
  meta: CaptionTemplateMeta,
  caption: string,
): string {
  const lead = meta.leadEmoji ? `${emojiChar(meta.leadEmoji)} ` : "";
  const trail = meta.trailEmoji ? ` ${emojiChar(meta.trailEmoji)}` : "";
  return `${lead}${caption}${trail}`;
}
