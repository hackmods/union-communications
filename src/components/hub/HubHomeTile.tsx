"use client";

import { Link } from "@/i18n/navigation";
import { Emoji } from "@/components/ui/Emoji";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import type { EmojiId } from "@/lib/constants/emoji";
import { cn } from "@/lib/utils";

type HubHomeTileProps = {
  href: string;
  title: string;
  body?: string;
  emojiId?: EmojiId;
  current?: boolean;
};

export function HubHomeTile({
  href,
  title,
  body,
  emojiId,
  current = false,
}: HubHomeTileProps) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="block h-full min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 focus-visible:ring-offset-2"
    >
      <Card
        variant="elevated"
        interactive
        density="compact"
        className={cn("h-full", current && "border-opseu-blue/40")}
      >
        <div className="flex items-start gap-3">
          {emojiId ? (
            <IconChip tone="brand" size="md">
              <Emoji id={emojiId} />
            </IconChip>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-opseu-dark sm:text-base">
              {title}
            </p>
            {body ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
            ) : null}
          </div>
          <span className="shrink-0 text-sm font-medium text-opseu-blue" aria-hidden>
            →
          </span>
        </div>
      </Card>
    </Link>
  );
}
