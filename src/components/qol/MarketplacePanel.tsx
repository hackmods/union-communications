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
  canPublishMarketplace,
} from "@/lib/qol/access";
import type { MarketplaceTemplateKind, SharedTemplate } from "@/types/qol";
import type { UserRole } from "@/types/tenant";

const KINDS: MarketplaceTemplateKind[] = [
  "ca_snippet",
  "email",
  "caption",
  "checklist",
  "other",
];

export function MarketplacePanel() {
  const t = useTranslations("qol");
  const { data: session } = useSession();
  const { readOnly } = useStewardReadOnly();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const canPublish = canPublishMarketplace(roles) && !readOnly;
  const userId = session?.user?.id ?? "";

  const [templates, setTemplates] = useState<SharedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<MarketplaceTemplateKind>("email");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function load(kindFilter?: string) {
    setLoading(true);
    const qs = kindFilter ? `?kind=${encodeURIComponent(kindFilter)}` : "";
    const res = await fetch(`/api/marketplace${qs}`);
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates);
    }
    setLoading(false);
  }

  useEffect(() => {
    void fetch("/api/marketplace")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    if (!canPublish) return;
    setError(null);
    const res = await fetch("/api/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, title, description, body }),
    });
    if (res.ok) {
      setTitle("");
      setDescription("");
      setBody("");
      setShowForm(false);
      await load(filterKind);
    } else {
      setError(t("marketplace.publishError"));
    }
  }

  async function copyTemplate(tmpl: SharedTemplate) {
    await navigator.clipboard.writeText(tmpl.body);
    setCopiedId(tmpl.id);
    setTimeout(() => setCopiedId(null), 2000);
    await fetch(`/api/marketplace/${tmpl.id}`);
  }

  async function removeTemplate(id: string) {
    if (readOnly) return;
    const res = await fetch(`/api/marketplace/${id}`, { method: "DELETE" });
    if (res.ok) await load(filterKind);
    else setError(t("marketplace.publishError"));
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
          <h1 className="text-3xl font-bold text-opseu-dark">
            {t("marketplace.title")}
          </h1>
          <p className="mt-1 text-gray-600">{t("marketplace.subtitle")}</p>
          <p className="mt-1 text-sm text-amber-800">{t("marketplace.scopeNote")}</p>
        </div>
        {canPublish && (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? t("marketplace.cancel") : t("marketplace.share")}
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="text-sm font-medium text-gray-700">
          <span className="sr-only">{t("marketplace.filterKind")}</span>
          <select
            value={filterKind}
            onChange={(e) => {
              setFilterKind(e.target.value);
              void load(e.target.value);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            aria-label={t("marketplace.filterKind")}
          >
            <option value="">{t("marketplace.allKinds")}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`marketplace.kinds.${k}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showForm && canPublish && (
        <Card className="mt-6 space-y-3">
          <CardTitle>{t("marketplace.share")}</CardTitle>
          <form onSubmit={handleShare} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {t("marketplace.kind")}
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as MarketplaceTemplateKind)
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`marketplace.kinds.${k}`)}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label={t("marketplace.fieldTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              label={t("marketplace.description")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Textarea
              label={t("marketplace.body")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              required
            />
            <Button type="submit">{t("marketplace.publish")}</Button>
          </form>
        </Card>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-gray-600">{t("marketplace.loading")}</p>
      ) : (
        <div className="mt-6 space-y-3">
          {templates.length === 0 ? (
            <Card>
              <p className="text-gray-600">{t("marketplace.empty")}</p>
            </Card>
          ) : (
            templates.map((tmpl) => (
              <Card key={tmpl.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t(`marketplace.kinds.${tmpl.kind}`)}
                    </p>
                    <CardTitle className="text-base">{tmpl.title}</CardTitle>
                    {tmpl.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {tmpl.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void copyTemplate(tmpl)}
                    >
                      {copiedId === tmpl.id
                        ? t("marketplace.copied")
                        : t("marketplace.copy")}
                    </Button>
                    {!readOnly &&
                      canDeleteSharedContent(
                        roles,
                        tmpl.sharedById,
                        userId,
                      ) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void removeTemplate(tmpl.id)}
                        >
                          {t("marketplace.delete")}
                        </Button>
                      )}
                  </div>
                </div>
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {tmpl.body}
                </pre>
                <p className="mt-2 text-xs text-gray-500">
                  {t("marketplace.sharedBy", {
                    name: tmpl.sharedByName,
                    date: new Date(tmpl.createdAt).toLocaleDateString(),
                  })}
                </p>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
