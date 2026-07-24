"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { sanitizePollSlug } from "@/lib/comms/pulse-poll";
import type {
  PollAggregates,
  PollDefinition,
  PollQuestion,
} from "@/types/polls";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PollsBoard() {
  const t = useTranslations("hubPolls");
  const locale = useLocale();
  const [polls, setPolls] = useState<PollDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("member-pulse");
  const [intro, setIntro] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aggregates, setAggregates] = useState<PollAggregates | null>(null);

  async function refresh() {
    const res = await fetch("/api/polls");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as { polls: PollDefinition[] };
    setPolls(data.polls);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/polls");
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { polls: PollDefinition[] };
        if (!cancelled) setPolls(data.polls);
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function loadResults(id: string) {
    setSelectedId(id);
    setAggregates(null);
    const res = await fetch(`/api/polls/id/${id}`);
    if (!res.ok) {
      setError(t("resultsError"));
      return;
    }
    const data = (await res.json()) as {
      poll: PollDefinition;
      aggregates: PollAggregates;
    };
    setAggregates(data.aggregates);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const qText = questionText.trim();
    if (!title.trim() || !qText) {
      setError(t("createError"));
      return;
    }
    const questions: PollQuestion[] = [
      {
        id: `q-${Date.now()}`,
        text: qText,
        type: "free_text",
      },
    ];
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: sanitizePollSlug(slug) || "member-pulse",
        title: title.trim(),
        intro: intro.trim() || undefined,
        questions,
        consentRequired: true,
        status: "open",
      }),
    });
    if (!res.ok) {
      setError(t("createError"));
      return;
    }
    setMessage(t("created"));
    setShowForm(false);
    setTitle("");
    setIntro("");
    setQuestionText("");
    setSlug("member-pulse");
    await refresh();
  }

  async function setStatus(id: string, status: "open" | "closed") {
    setError(null);
    const res = await fetch(`/api/polls/id/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    setMessage(status === "open" ? t("opened") : t("closed"));
    await refresh();
    if (selectedId === id) await loadResults(id);
  }

  async function handleExport(id: string, format: "csv" | "xlsx") {
    setError(null);
    try {
      const res = await fetch(`/api/polls/id/${id}/export?format=${format}`);
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition");
      const match = disp?.match(/filename="([^"]+)"/);
      downloadBlob(blob, match?.[1] ?? `poll-results.${format}`);
      setMessage(t("exported"));
    } catch {
      setError(t("exportError"));
    }
  }

  if (loading) {
    return (
      <PageShell size="wide" className="py-6 md:py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-40 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell size="wide" className="py-6 md:py-8">
      <h1 className="text-2xl font-semibold text-opseu-dark">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
      <p className="mt-2 text-xs text-gray-500">{t("privacy")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? t("cancel") : t("newPoll")}
        </Button>
        <Link
          href="/tools/pulse-poll"
          className="inline-flex min-h-11 items-center text-sm text-opseu-blue underline"
        >
          {t("authoringTool")}
        </Link>
      </div>

      {message && (
        <p className="mt-3 text-sm text-green-800" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="mt-4 space-y-3 rounded-md border border-gray-200 p-4"
        >
          <Input
            label={t("fields.title")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label={t("fields.slug")}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
          <Textarea
            label={t("fields.intro")}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
          />
          <Textarea
            label={t("fields.firstQuestion")}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            required
          />
          <Button type="submit" size="sm">
            {t("create")}
          </Button>
        </form>
      )}

      {polls.length === 0 ? (
        <EmptyState className="mt-6" title={t("empty")} />
      ) : (
        <ul className="mt-6 space-y-4">
          {polls.map((poll) => (
            <li
              key={poll.id}
              className="rounded-md border border-gray-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-opseu-dark">
                    {poll.title}
                  </h2>
                  <p className="text-xs text-gray-500">
                    /{locale}/poll/{poll.slug} · {t(`status.${poll.status}`)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void loadResults(poll.id)}
                  >
                    {t("viewResults")}
                  </Button>
                  {poll.status === "open" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void setStatus(poll.id, "closed")}
                    >
                      {t("close")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void setStatus(poll.id, "open")}
                    >
                      {t("open")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleExport(poll.id, "csv")}
                  >
                    {t("exportCsv")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleExport(poll.id, "xlsx")}
                  >
                    {t("exportXlsx")}
                  </Button>
                </div>
              </div>

              {selectedId === poll.id && aggregates && (
                <div className="mt-4 space-y-3 border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-700">
                    {t("responseCount", { count: aggregates.responseCount })}
                  </p>
                  {aggregates.questions.map((q) => (
                    <div key={q.questionId} className="text-sm">
                      <p className="font-medium text-gray-900">{q.text}</p>
                      {q.type === "single_choice" && q.optionCounts ? (
                        <ul className="mt-1 list-inside list-disc text-gray-700">
                          {Object.entries(q.optionCounts).map(([opt, n]) => (
                            <li key={opt}>
                              {opt}: {n}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="mt-1 space-y-1 text-gray-700">
                          {(q.freeText ?? []).length === 0 ? (
                            <li className="text-gray-500">{t("noAnswers")}</li>
                          ) : (
                            (q.freeText ?? []).map((line, i) => (
                              <li
                                key={`${q.questionId}-${i}`}
                                className="rounded bg-gray-50 px-2 py-1"
                              >
                                {line}
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
