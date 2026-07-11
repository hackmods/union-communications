"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useStewardReadOnly } from "@/hooks/use-steward-read-only";
import {
  canDeleteSharedContent,
  canManageQolContent,
} from "@/lib/qol/access";
import type { CaSnippet } from "@/types/qol";
import type { UserRole } from "@/types/tenant";

export function SnippetLibrary() {
  const t = useTranslations("qol");
  const { data: session } = useSession();
  const { readOnly } = useStewardReadOnly();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const canWrite = canManageQolContent(roles) && !readOnly;
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

      <div className="mt-6 flex flex-wrap gap-2">
        <Input
          label={t("snippets.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
        <div className="flex items-end">
          <Button variant="outline" onClick={() => void load(query)}>
            {t("snippets.searchBtn")}
          </Button>
        </div>
      </div>

      {showForm && canWrite && (
        <Card className="mt-6 space-y-3">
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
        <p className="mt-6 text-gray-600">{t("snippets.loading")}</p>
      ) : (
        <div className="mt-6 space-y-3">
          {snippets.length === 0 ? (
            <Card>
              <p className="text-gray-600">{t("snippets.empty")}</p>
            </Card>
          ) : (
            snippets.map((s) => (
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
            ))
          )}
        </div>
      )}
    </div>
  );
}
