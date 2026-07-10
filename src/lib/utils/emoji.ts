import { EMOJIS, type EmojiDef, type EmojiId } from "@/lib/constants/emoji";

const supportCache = new Map<string, boolean>();

/**
 * Canvas probe: returns false when the glyph renders blank (missing font support).
 * Does not detect monochrome text-presentation symbols — use `preferFallback` for those.
 */
export function isEmojiGlyphSupported(emoji: string): boolean {
  if (typeof document === "undefined") return true;
  if (supportCache.has(emoji)) return supportCache.get(emoji)!;

  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    supportCache.set(emoji, true);
    return true;
  }

  ctx.textBaseline = "top";
  ctx.font = '16px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(emoji, 0, 0);
  const data = ctx.getImageData(0, 0, 16, 16).data;

  let hasColor = false;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r !== g || g !== b) {
      hasColor = true;
      break;
    }
  }

  supportCache.set(emoji, hasColor);
  return hasColor;
}

export function resolveEmoji(def: EmojiDef): string {
  if (def.preferFallback) return def.fallback;
  if (typeof document === "undefined") return def.primary;
  return isEmojiGlyphSupported(def.primary) ? def.primary : def.fallback;
}

export function resolveEmojiById(id: EmojiId): string {
  return resolveEmoji(EMOJIS[id]);
}
