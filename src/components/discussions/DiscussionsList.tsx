"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Callout } from "@/components/ui/Callout";
import type { DiscussionThread } from "@/types/discussions";

export function DiscussionsList() {
  const t = useTranslations("discussions");
  const { data: session } = useSession();
  const [threads, setThreads] = useState<DiscussionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [grievanceId, setGrievanceId] = useState("");
  const [bumpingCaseId, setBumpingCaseId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/discussions");
      if (!res.ok) {
        setError(t("loadError"));
        setThreads([]);
        return;
      }
      const data = await res.json();
      setThreads(data.threads ?? []);
      setError(null);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetch("/api/discussions")
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        setThreads(data.threads ?? []);
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          grievanceId: grievanceId.trim() || undefined,
          bumpingCaseId: bumpingCaseId.trim() || undefined,
          bargainingUnitId: session.user.bargainingUnitId,
        }),
      });
      if (!res.ok) {
        setError(t("createError"));
        return;
      }
      setTitle("");
      setBody("");
      setGrievanceId("");
      setBumpingCaseId("");
      setShowForm(false);
      setLoading(true);
      await load();
    } catch {
      setError(t("createError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-prose text-gray-600">{t("subtitle")}</p>
        </div>
        <Button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="min-h-11"
        >
          {showForm ? t("cancel") : t("newThread")}
        </Button>
      </div>

      {error && (
        <Callout tone="danger" className="mt-4">
          {error}
        </Callout>
      )}

      {showForm && (
        <Card className="mt-6" density="compact">
          <CardTitle>{t("newThread")}</CardTitle>
          <form onSubmit={handleCreate} className="mt-3 space-y-3">
            <div>
              <label htmlFor="disc-title" className="text-sm font-medium text-gray-700">
                {t("threadTitle")}
              </label>
              <Input
                id="disc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={300}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="disc-body" className="text-sm font-medium text-gray-700">
                {t("threadBody")}
              </label>
              <Textarea
                id="disc-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="disc-grev"
                  className="text-sm font-medium text-gray-700"
                >
                  {t("grievanceIdOptional")}
                </label>
                <Input
                  id="disc-grev"
                  value={grievanceId}
                  onChange={(e) => setGrievanceId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="disc-bump"
                  className="text-sm font-medium text-gray-700"
                >
                  {t("bumpingCaseIdOptional")}
                </label>
                <Input
                  id="disc-bump"
                  value={bumpingCaseId}
                  onChange={(e) => setBumpingCaseId(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">{t("linkHint")}</p>
            <Button type="submit" disabled={saving} className="min-h-11">
              {saving ? t("saving") : t("create")}
            </Button>
          </form>
        </Card>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-gray-600" aria-live="polite">
            {t("loading")}
          </p>
        ) : threads.length === 0 ? (
          <Callout tone="muted">{t("empty")}</Callout>
        ) : (
          threads.map((thread) => (
            <Card key={thread.id} density="compact">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/app/discussions/${thread.id}`}
                    className="text-lg font-semibold text-opseu-dark hover:underline"
                  >
                    {thread.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                    {thread.body}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
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
                </div>
                <Link
                  href={`/app/discussions/${thread.id}`}
                  className="inline-flex min-h-11 items-center text-sm font-medium text-opseu-blue underline"
                >
                  {t("open")}
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
