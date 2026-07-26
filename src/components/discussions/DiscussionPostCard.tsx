"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { HubReactionBar } from "@/components/hub/HubReactionBar";
import { MentionText } from "@/components/hub/MentionText";
import type { DiscussionPost } from "@/types/discussions";
import type { HubReactionKind, MentionableUser } from "@/types/hub-social";

export function DiscussionPostCard({
  threadId,
  post,
  roster,
  canReact,
  onReactionChange,
}: {
  threadId: string;
  post: DiscussionPost;
  roster: MentionableUser[];
  canReact: boolean;
  onReactionChange: (post: DiscussionPost) => void;
}) {
  const t = useTranslations("discussions");
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);

  async function toggleReaction(kind: HubReactionKind) {
    if (!canReact || saving) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/discussions/${threadId}/posts/${post.id}/reactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind }),
        },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { post: DiscussionPost };
      onReactionChange(data.post);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card density="compact">
      <MentionText body={post.body} roster={roster} />
      <p className="mt-2 text-xs text-gray-500">
        {post.authorName} · {new Date(post.createdAt).toLocaleString()}
      </p>
      <HubReactionBar
        reactions={post.reactions}
        currentUserId={session?.user?.id}
        disabled={!canReact || saving}
        onToggle={toggleReaction}
      />
      {post.mentionedUserIds.length > 0 ? (
        <p className="mt-1 text-xs text-gray-500">{t("mentionedCount", { count: post.mentionedUserIds.length })}</p>
      ) : null}
    </Card>
  );
}

export function useMentionableRoster() {
  const [roster, setRoster] = useState<MentionableUser[]>([]);

  useEffect(() => {
    void fetch("/api/discussions/mentionables")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { users: MentionableUser[] };
        setRoster(data.users ?? []);
      })
      .catch(() => {
        setRoster([]);
      });
  }, []);

  return roster;
}
