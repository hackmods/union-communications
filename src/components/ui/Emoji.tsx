"use client";

import { useSyncExternalStore } from "react";
import { getEmoji, type EmojiId } from "@/lib/constants/emoji";
import { resolveEmojiById } from "@/lib/utils/emoji";

interface EmojiProps {
  id: EmojiId;
  className?: string;
}

function getServerGlyph(id: EmojiId): string {
  const def = getEmoji(id);
  return def.preferFallback ? def.fallback : def.primary;
}

export function Emoji({ id, className }: EmojiProps) {
  const def = getEmoji(id);
  const glyph = useSyncExternalStore(
    () => () => {},
    () => resolveEmojiById(id),
    () => getServerGlyph(id),
  );

  return (
    <span className={className} role="img" aria-label={def.label}>
      {glyph}
    </span>
  );
}
