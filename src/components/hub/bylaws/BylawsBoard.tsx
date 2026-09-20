"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import {
  BYLAW_ARTICLE_KEYS,
  type BylawArticleKey,
  type BylawArticleOverrides,
} from "@/lib/bylaws/articles";
import {
  buildBylawArticleMap,
  buildBylawTemplate,
  createEmptyBylawForm,
  type BylawBuilderMode,
  type BylawFormValues,
} from "@/lib/bylaws/build-template";
import type {
  HubBylawDraft,
  HubBylawStatus,
} from "@/types/hub-bylaws";

const STATUSES: HubBylawStatus[] = [
  "draft",
  "committee",
  "pending_gmm",
  "adopted",
  "archived",
];

const STATUS_BADGE: Record<HubBylawStatus, "muted" | "info" | "warning" | "success"> = {
  draft: "muted",
  committee: "info",
  pending_gmm: "warning",
  adopted: "success",
  archived: "muted",
};

const FORM_KEYS: (keyof BylawFormValues)[] = [
  "localName",
  "vicePresidents",
  "stewards",
  "gmmQuorum",
  "lecQuorum",
  "signingOfficers",
  "trustees",
  "meetingFrequency",
  "electionTerm",
  "amendmentNotice",
  "fiscalYearEnd",
];

type StoredForm = HubBylawDraft["form"];

function formToDraft(
  _mode: BylawBuilderMode,
  form: StoredForm,
): BylawFormValues & {
  articleSet: string;
  articleOverrides: BylawArticleOverrides;
  existingBylaws: string;
} {
  const values = {} as BylawFormValues;
  for (const key of FORM_KEYS) {
    const raw = form[key];
    values[key] = typeof raw === "string" ? raw : "";
  }
  return {
    ...values,
    articleSet: typeof form.articleSet === "string" ? form.articleSet : "standard",
    articleOverrides: (form.articleOverrides ?? {}) as BylawArticleOverrides,
    existingBylaws:
      typeof form.existingBylaws === "string" ? form.existingBylaws : "",
  };
}

export function BylawsBoard() {
  const t = useTranslations("hubBylaws");
  const tb = useTranslations("bylawBuilder");
  const [drafts, setDrafts] = useState<HubBylawDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<BylawBuilderMode>("template");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const labels = useMemo(
    () => ({
      placeholders: {
        localName: tb("placeholders.localName"),
        vicePresidents: tb("placeholders.vicePresidents"),
        stewards: tb("placeholders.stewards"),
        gmmQuorum: tb("placeholders.gmmQuorum"),
        lecQuorum: tb("placeholders.lecQuorum"),
        signingOfficers: tb("placeholders.signingOfficers"),
        trustees: tb("placeholders.trustees"),
        meetingFrequency: tb("placeholders.meetingFrequency"),
        electionTerm: tb("placeholders.electionTerm"),
        amendmentNotice: tb("placeholders.amendmentNotice"),
        fiscalYearEnd: tb("placeholders.fiscalYearEnd"),
      },
      articles: Object.fromEntries(
        BYLAW_ARTICLE_KEYS.map((key) => [key, tb(`articles.${key}`)]),
      ) as Record<BylawArticleKey, string>,
    }),
    [tb],
  );

  const opseuArticles = useMemo(
    () =>
      Object.fromEntries(
        BYLAW_ARTICLE_KEYS.map((key) => [key, tb(`opseuArticles.${key}`)]),
      ) as Record<BylawArticleKey, string>,
    [tb],
  );

  function previewFor(draft: HubBylawDraft): string {
    const base = formToDraft(draft.mode, draft.form);
    const articleMap = buildBylawArticleMap(base, labels, {
      articleSet: base.articleSet as "standard" | "opseu",
      opseuArticles,
      articleOverrides: base.articleOverrides,
    });
    if (draft.mode === "committee") {
      return BYLAW_ARTICLE_KEYS.map((key) => articleMap[key]).join("\n\n");
    }
    return buildBylawTemplate(base, labels, {
      articleSet: base.articleSet as "standard" | "opseu",
      opseuArticles,
      articleOverrides: base.articleOverrides,
    });
  }

  async function refresh() {
    const res = await fetch("/api/bylaws");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as { drafts: HubBylawDraft[] };
    setDrafts(data.drafts);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/bylaws");
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { drafts: HubBylawDraft[] };
        if (!cancelled) setDrafts(data.drafts);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    setMessage(null);
    const res = await fetch("/api/bylaws", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        mode,
        form: createEmptyBylawForm(),
      }),
    });
    if (res.ok) {
      setMessage(t("created"));
      setTitle("");
      setShowForm(false);
      await refresh();
    } else {
      setError(t("createError"));
    }
  }

  async function changeStatus(id: string, status: HubBylawStatus) {
    setError(null);
    const res = await fetch(`/api/bylaws/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setMessage(t("updated"));
      await refresh();
    } else {
      setError(t("updateError"));
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/bylaws/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage(t("deleted"));
      if (expandedId === id) setExpandedId(null);
      await refresh();
    } else {
      setError(t("deleteError"));
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-opseu-dark">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setShowForm((v) => !v);
            setTitle("");
          }}
        >
          {showForm ? t("cancel") : t("newDraft")}
        </Button>
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
          className="mt-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colTitle")}
            </span>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colMode")}
            </span>
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as BylawBuilderMode)}
            >
              <option value="template">{t("modeTemplate")}</option>
              <option value="committee">{t("modeCommittee")}</option>
            </Select>
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">{t("save")}</Button>
          </div>
        </form>
      )}

      {loading && (
        <div className="mt-6 space-y-3" role="status" aria-busy="true" aria-label={t("loading")}>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!loading && !error && drafts.length === 0 && (
        <EmptyState className="mt-6" title={t("empty")} />
      )}

      {drafts.length > 0 && (
        <ul className="mt-6 space-y-3">
          {drafts.map((draft) => {
            const expanded = expandedId === draft.id;
            return (
              <li
                key={draft.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-opseu-dark">
                        {draft.title}
                      </h2>
                      <Badge variant={STATUS_BADGE[draft.status]}>
                        {t(`status.${draft.status}`)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {t(draft.mode === "committee" ? "modeCommittee" : "modeTemplate")}
                      {" · "}
                      {t("updatedLabel", {
                        date: new Date(draft.updatedAt).toLocaleString(),
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedId(expanded ? null : draft.id)}
                    >
                      {expanded ? t("hidePreview") : t("preview")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(draft.id)}
                    >
                      {t("delete")}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">
                    {t("colStatus")}
                  </span>
                  <Select
                    aria-label={t("colStatus")}
                    className="w-52"
                    value={draft.status}
                    onChange={(e) =>
                      void changeStatus(draft.id, e.target.value as HubBylawStatus)
                    }
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {t(`status.${status}`)}
                      </option>
                    ))}
                  </Select>
                </div>
                {expanded && (
                  <div className="mt-3">
                    <Callout tone="muted">
                      <p className="text-xs text-gray-700">{t("hint")}</p>
                    </Callout>
                    <pre
                      className="mt-2 max-h-96 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs whitespace-pre-wrap text-gray-800"
                    >
                      {previewFor(draft)}
                    </pre>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}