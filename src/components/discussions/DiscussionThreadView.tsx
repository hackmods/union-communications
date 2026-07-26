"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Callout } from "@/components/ui/Callout";
import {
  DiscussionPostCard,
  useMentionableRoster,
} from "@/components/discussions/DiscussionPostCard";
import { useHubPoll } from "@/components/hub/useHubPoll";
import type {
  DiscussionPost,
  DiscussionThread,
} from "@/types/discussions";

export function DiscussionThreadView({ threadId }: { threadId: string }) {
  const t = useTranslations("discussions");
  const roster = useMentionableRoster();
  const [thread, setThread] = useState<DiscussionThread | null>(null);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [canReply, setCanReply] = useState(true);
  const lastSyncRef = useRef<string>(new Date().toISOString());

  const applyThreadData = useCallback((data: {
    thread: DiscussionThread;
    posts: DiscussionPost[];
  }) => {
    setThread(data.thread);
    setPosts(data.posts ?? []);
    lastSyncRef.current = new Date().toISOString();
    setError(null);
  }, []);

  const refreshThread = useCallback(async (since?: string) => {
    const query = since ? `?since=${encodeURIComponent(since)}` : "";
    const res = await fetch(`/api/discussions/${threadId}${query}`);
    if (res.status === 403) {
      setError(t("forbidden"));
      setThread(null);
      setPosts([]);
      return;
    }
    if (!res.ok) throw new Error("fail");
    const data = await res.json();
    if (since && data.changed === false) return;
    applyThreadData(data);
  }, [applyThreadData, t, threadId]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/discussions/${threadId}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) {
          setError(t("forbidden"));
          setThread(null);
          setPosts([]);
          return;
        }
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        applyThreadData(data);
        setCanReply(true);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyThreadData, t, threadId]);

  useHubPoll(Boolean(thread), () =>
    refreshThread(lastSyncRef.current).catch(() => undefined),
  );

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/discussions/${threadId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      if (res.status === 403) {
        setCanReply(false);
        setError(t("replyForbidden"));
        return;
      }
      if (!res.ok) {
        setError(t("replyError"));
        return;
      }
      setReply("");
      await refreshThread();
    } catch {
      setError(t("replyError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-gray-600" aria-live="polite">
        {t("loading")}
      </p>
    );
  }

  if (!thread) {
    return (
      <div>
        <Link
          href="/app/discussions"
          className="text-sm text-opseu-blue underline"
        >
          {t("backToList")}
        </Link>
        <Callout tone="danger" className="mt-4">
          {error ?? t("notFound")}
        </Callout>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/app/discussions"
        className="text-sm text-opseu-blue underline"
      >
        {t("backToList")}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-opseu-dark md:text-3xl">
        {thread.title}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {t("meta", {
          author: thread.createdByName,
          posts: thread.postCount,
          updated: new Date(thread.lastPostAt).toLocaleString(),
        })}
        {thread.grievanceId
          ? ` · ${t("linkedGrievance", { id: thread.grievanceId })}`
          : ""}
        {thread.bumpingCaseId
          ? ` · ${t("linkedBumping", { id: thread.bumpingCaseId })}`
          : ""}
      </p>
      <p className="mt-1 text-xs text-gray-500">{t("livePollHint")}</p>

      {error && (
        <Callout tone="danger" className="mt-4">
          {error}
        </Callout>
      )}

      <div className="mt-6 space-y-3">
        {posts.map((post) => (
          <DiscussionPostCard
            key={post.id}
            threadId={threadId}
            post={post}
            roster={roster}
            canReact={canReply}
            onReactionChange={(updated) => {
              setPosts((current) =>
                current.map((row) => (row.id === updated.id ? updated : row)),
              );
              lastSyncRef.current = new Date().toISOString();
            }}
          />
        ))}
      </div>

      {canReply ? (
        <Card className="mt-6" density="compact">
          <CardTitle>{t("reply")}</CardTitle>
          <p className="mt-1 text-xs text-gray-500">{t("mentionHint")}</p>
          <form onSubmit={handleReply} className="mt-3 space-y-3">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              required
              rows={4}
              aria-label={t("reply")}
            />
            <Button type="submit" disabled={saving} className="min-h-11">
              {saving ? t("saving") : t("postReply")}
            </Button>
          </form>
        </Card>
      ) : (
        <Callout tone="muted" className="mt-6">
          {t("replyForbidden")}
        </Callout>
      )}
    </div>
  );
}
