/**
 * Site emoji registry with cross-platform fallbacks.
 *
 * Some characters (e.g. ⚠️) are text-presentation symbols that render as
 * monochrome glyphs on Windows and older Android. Prefer `fallback` for copy
 * and when runtime detection is unavailable.
 */
export type EmojiId =
  | "megaphone"
  | "clipboard"
  | "document"
  | "warning"
  | "star"
  | "strength"
  | "clock"
  | "chat";

export interface EmojiDef {
  id: EmojiId;
  /** Preferred emoji when the platform renders it in full colour */
  primary: string;
  /** Safer alternate for platforms with incomplete emoji fonts */
  fallback: string;
  /** Accessible name */
  label: string;
  /**
   * When true, always use fallback (text-presentation or inconsistent colour).
   * When false, UI may probe support and choose primary when available.
   */
  preferFallback: boolean;
}

export const EMOJIS: Record<EmojiId, EmojiDef> = {
  megaphone: {
    id: "megaphone",
    primary: "📢",
    fallback: "📣",
    label: "Megaphone",
    preferFallback: false,
  },
  clipboard: {
    id: "clipboard",
    primary: "📋",
    fallback: "📝",
    label: "Clipboard",
    preferFallback: false,
  },
  document: {
    id: "document",
    primary: "📄",
    fallback: "📃",
    label: "Document",
    preferFallback: false,
  },
  warning: {
    id: "warning",
    primary: "⚠️",
    fallback: "❗",
    label: "Warning",
    preferFallback: true,
  },
  star: {
    id: "star",
    primary: "🌟",
    fallback: "⭐",
    label: "Star",
    preferFallback: false,
  },
  strength: {
    id: "strength",
    primary: "💪",
    fallback: "✊",
    label: "Solidarity",
    preferFallback: false,
  },
  clock: {
    id: "clock",
    primary: "🕐",
    fallback: "⏱",
    label: "Clock",
    preferFallback: false,
  },
  chat: {
    id: "chat",
    primary: "💬",
    fallback: "🗨",
    label: "Discussion",
    preferFallback: false,
  },
};

export function getEmoji(id: EmojiId): EmojiDef {
  return EMOJIS[id];
}

/** Resolved emoji for static copy (captions, exports) - uses fallback when required */
export function emojiChar(id: EmojiId): string {
  const def = EMOJIS[id];
  return def.preferFallback ? def.fallback : def.primary;
}
