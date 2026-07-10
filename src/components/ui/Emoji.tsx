"use client";

import { useEffect, useState } from "react";
import { getEmoji, type EmojiId } from "@/lib/constants/emoji";
import { resolveEmojiById } from "@/lib/utils/emoji";

interface EmojiProps {
  id: EmojiId;
  className?: string;
}

export function Emoji({ id, className }: EmojiProps) {
  const def = getEmoji(id);
  const [glyph, setGlyph] = useState(def.preferFallback ? def.fallback : def.primary);

  useEffect(() => {
    setGlyph(resolveEmojiById(id));
  }, [id]);

  return (
    <span className={className} role="img" aria-label={def.label}>
      {glyph}
    </span>
  );
}
