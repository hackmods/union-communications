"use client";

import { useTranslations } from "next-intl";
import {
  countHubReactions,
  userHasHubReaction,
} from "@/lib/hub/reactions";
import type { HubReaction, HubReactionKind } from "@/types/hub-social";

const REACTION_ORDER: HubReactionKind[] = [
  "solidarity",
  "ack",
  "question",
];

export function HubReactionBar({
  reactions,
  currentUserId,
  disabled,
  onToggle,
}: {
  reactions: HubReaction[];
  currentUserId?: string;
  disabled?: boolean;
  onToggle: (kind: HubReactionKind) => void;
}) {
  const t = useTranslations("hubSocial");

  return (
    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t("reactionsLabel")}>
      {REACTION_ORDER.map((kind) => {
        const count = countHubReactions(reactions, kind);
        const active =
          currentUserId != null &&
          userHasHubReaction(reactions, kind, currentUserId);
        return (
          <button
            key={kind}
            type="button"
            disabled={disabled || !currentUserId}
            onClick={() => onToggle(kind)}
            aria-pressed={active}
            aria-label={
              count > 0
                ? t("reactionWithCount", {
                    name: t(`reaction.${kind}`),
                    count,
                  })
                : t(`reaction.${kind}`)
            }
            className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40 disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? "border-opseu-blue bg-opseu-blue/10 text-opseu-dark"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <span aria-hidden>{t(`reaction.${kind}`)}</span>
            {count > 0 ? <span aria-hidden>{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
