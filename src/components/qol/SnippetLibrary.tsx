"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStewardReadOnly } from "@/hooks/use-steward-read-only";
import {
  canDeleteSharedContent,
  canManageQolContent,
} from "@/lib/qol/access";
import type { CaSnippet } from "@/types/qol";
import type { UserRole } from "@/types/tenant";

function canReplaceUnionLibrary(roles: UserRole[]): boolean {
  return roles.some((r) =>
    ["union_admin", "platform_admin", "local_president"].includes(r),
  );
}

function canResetSnippetLibrary(roles: UserRole[]): boolean {
  return roles.some((r) => ["union_admin", "platform_admin"].includes(r));
}

export function SnippetLibrary() {
  const t = useTranslations("qol");
  const { data: session } = useSession();
  const { readOnly } = useStewardReadOnly();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const canWrite = canManageQolContent(roles) && !readOnly;
  const canReplace = canReplaceUnionLibrary(roles) && !readOnly;
  const canReset = canResetSnippetLibrary(roles) && !readOnly;
  const userId = session?.user?.id ?? "";

  const [snippets, setSnippets] = useState<CaSnippet[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [clauseRef, setClauseRef] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [bulkFormat, setBulkFormat] = useState<"csv" | "text">("csv");
  const [bulkMode, setBulkMode] = useState<"append" | "replace_union">("append");
  const [bulkContent, setBulkContent] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  async function load(q?: string) {
    setLoading(true);
    const res = await fetch(
      `/api/snippets${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    );
    if (res.ok) {
      const data = await res.json();
      setSnippets(data.snippets);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/snippets")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setSnippets(data.snippets);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    const res = await fetch("/api/snippets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        clauseRef,
        body,
        tags: tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    if (res.ok) {
      setTitle("");
      setClauseRef("");
      setBody("");
      setTags("");
      setShowForm(false);
      setMessage(t("snippets.created"));
      await load(query);
    } else {
      setError(t("snippets.createError"));
    }
  }

  async function handleBulkImport(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    if (bulkMode === "replace_union" && !canReplace) return;
    setError(null);
    setMessage(null);
    setBulkBusy(true);
    try {
      const res = await fetch("/api/snippets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: bulkFormat,
          content: bulkContent,
          mode: bulkMode,
        }),
      });
      if (!res.ok) {
        setError(t("snippets.bulkError"));
        return;
      }
      const data = (await res.json()) as {
        created: number;
        skipped: number;
        removed?: number;
      };
      setMessage(
        t("snippets.bulkSuccess", {
          created: data.created,
          skipped: data.skipped,
        }),
      );
      setBulkContent("");
      await load(query);
    } catch {
      setError(t("snippets.bulkError"));
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleFilePick(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setBulkContent(text);
    if (file.name.toLowerCase().endsWith(".csv")) {
      setBulkFormat("csv");
    } else if (
      file.name.toLowerCase().endsWith(".txt") ||
      file.name.toLowerCase().endsWith(".text")
    ) {
      setBulkFormat("text");
    }
  }

  async function handleResetLibrary() {
    if (!canReset) return;
    const confirmed = window.confirm(t("snippets.resetConfirm"));
    if (!confirmed) return;
    setError(null);
    setMessage(null);
    setResetBusy(true);
    try {
      const res = await fetch("/api/snippets/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET SNIPPETS" }),
      });
      if (!res.ok) {
        setError(t("snippets.resetError"));
        return;
      }
      const data = (await res.json()) as { removed: number };
      setMessage(t("snippets.resetSuccess", { removed: data.removed }));
      await load(query);
    } catch {
      setError(t("snippets.resetError"));
    } finally {
      setResetBusy(false);
    }
  }

  async function copySnippet(snippet: CaSnippet) {
    await navigator.clipboard.writeText(
      `${snippet.clauseRef} - ${snippet.title}\n\n${snippet.body}`,
    );
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function removeSnippet(id: string) {
    if (readOnly) return;
    const res = await fetch(`/api/snippets/${id}`, { method: "DELETE" });
    if (res.ok) await load(query);
    else setError(t("snippets.createError"));
  }

  return (
    <div>
      {readOnly && (
        <p
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {t("mobile.readOnlyBanner")}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-opseu-dark">{t("snippets.title")}</h1>
          <p className="mt-1 text-gray-600">{t("snippets.subtitle")}</p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? t("snippets.cancel") : t("snippets.add")}
          </Button>
        )}
      </div>

      <div className="mt-6 xl:grid xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] xl:items-start xl:gap-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 xl:flex-col">
            <Input
              label={t("snippets.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-md xl:max-w-none"
            />
            <div className="flex items-end">
              <Button variant="outline" onClick={() => void load(query)}>
                {t("snippets.searchBtn")}
              </Button>
            </div>
          </div>
        </div>

        <div>
      {showForm && canWrite && (
        <Card className="space-y-3">
          <CardTitle>{t("snippets.add")}</CardTitle>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              label={t("snippets.fieldTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              label={t("snippets.clauseRef")}
              value={clauseRef}
              onChange={(e) => setClauseRef(e.target.value)}
              required
            />
            <Textarea
              label={t("snippets.body")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              required
            />
            <Input
              label={t("snippets.tags")}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t("snippets.tagsHint")}
            />
            <Button type="submit">{t("snippets.save")}</Button>
          </form>
        </Card>
      )}

      {canWrite && (
        <Card className="mt-4 space-y-3">
          <CardTitle>{t("snippets.bulkTitle")}</CardTitle>
          <p className="text-sm text-gray-600">{t("snippets.bulkHint")}</p>
          <form onSubmit={(e) => void handleBulkImport(e)} className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <label className="block text-sm font-medium text-gray-700">
                {t("snippets.bulkFormat")}
                <select
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={bulkFormat}
                  onChange={(e) =>
                    setBulkFormat(e.target.value as "csv" | "text")
                  }
                >
                  <option value="csv">{t("snippets.bulkFormatCsv")}</option>
                  <option value="text">{t("snippets.bulkFormatText")}</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700">
                {t("snippets.bulkMode")}
                <select
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={bulkMode}
                  onChange={(e) =>
                    setBulkMode(e.target.value as "append" | "replace_union")
                  }
                >
                  <option value="append">{t("snippets.bulkModeAppend")}</option>
                  {canReplace && (
                    <option value="replace_union">
                      {t("snippets.bulkModeReplace")}
                    </option>
                  )}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              {t("snippets.bulkFile")}
              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                className="mt-1 block w-full text-sm"
                onChange={(e) =>
                  void handleFilePick(e.target.files?.[0] ?? null)
                }
              />
            </label>
            <Textarea
              label={t("snippets.bulkContent")}
              value={bulkContent}
              onChange={(e) => setBulkContent(e.target.value)}
              rows={6}
              required
            />
            <Button type="submit" disabled={bulkBusy || !bulkContent.trim()}>
              {bulkBusy ? t("snippets.bulkWorking") : t("snippets.bulkImport")}
            </Button>
          </form>
        </Card>
      )}

      {canReset && (
        <Card className="mt-4 space-y-3 border-red-200">
          <CardTitle>{t("snippets.resetTitle")}</CardTitle>
          <p className="text-sm text-gray-600">{t("snippets.resetHint")}</p>
          <Button
            variant="ghost"
            disabled={resetBusy}
            onClick={() => void handleResetLibrary()}
          >
            {resetBusy ? t("snippets.resetWorking") : t("snippets.resetButton")}
          </Button>
        </Card>
      )}

      {message && (
        <p className="mt-4 text-sm text-opseu-blue" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div
          className="mt-6 space-y-3"
          aria-busy="true"
          aria-label={t("snippets.loading")}
        >
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : snippets.length === 0 ? (
        <EmptyState
          className="mt-6"
          title={t("snippets.empty")}
          action={
            canWrite ? (
              <Button size="sm" onClick={() => setShowForm(true)}>
                {t("snippets.add")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {snippets.map((s) => (
            <Card key={s.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <p className="mt-1 text-sm font-medium text-opseu-blue">
                    {s.clauseRef}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void copySnippet(s)}
                  >
                    {copiedId === s.id
                      ? t("snippets.copied")
                      : t("snippets.copy")}
                  </Button>
                  {!readOnly &&
                    canDeleteSharedContent(roles, s.createdById, userId) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void removeSnippet(s.id)}
                      >
                        {t("snippets.delete")}
                      </Button>
                    )}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                {s.body}
              </p>
              {s.tags.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  {s.tags.join(" · ")}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
