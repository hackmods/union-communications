"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Input";
import {
  SITE_FEEDBACK_CATEGORIES,
  SITE_FEEDBACK_SOURCES,
  SITE_FEEDBACK_STATUSES,
  type SiteFeedbackCategory,
  type SiteFeedbackInboxItem,
  type SiteFeedbackSource,
  type SiteFeedbackStatus,
} from "@/types/platform-feedback";

async function fetchInbox(filters: {
  status: string;
  category: string;
  source: string;
}): Promise<SiteFeedbackInboxItem[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.source) params.set("source", filters.source);
  const qs = params.toString();
  const res = await fetch(`/api/platform-feedback${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    throw new Error("load");
  }
  const data = (await res.json()) as { items: SiteFeedbackInboxItem[] };
  return data.items;
}

export function SiteFeedbackInbox({ memoryBackend }: { memoryBackend: boolean }) {
  const t = useTranslations("hub.siteFeedback");
  const [items, setItems] = useState<SiteFeedbackInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await fetchInbox({ status, category, source });
        if (cancelled) return;
        setItems(next);
        setError(null);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError(t("loadError"));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, category, source, t]);

  async function refresh() {
    try {
      const next = await fetchInbox({ status, category, source });
      setItems(next);
      setError(null);
    } catch {
      setError(t("loadError"));
    }
  }

  async function saveItem(
    id: string,
    patch: { status?: SiteFeedbackStatus; stewardNote?: string | null },
  ) {
    const res = await fetch(`/api/platform-feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setError(t("saveError"));
      return;
    }
    await refresh();
  }

  async function deleteItem(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    const res = await fetch(`/api/platform-feedback/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(t("deleteError"));
      return;
    }
    if (openId === id) setOpenId(null);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-opseu-dark">{t("title")}</h1>
        <p className="mt-2 max-w-prose text-gray-700">{t("subtitle")}</p>
      </div>

      {memoryBackend ? (
        <Callout tone="warning">{t("memoryWarning")}</Callout>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Select
          label={t("filterStatus")}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t("filterAll")}</option>
          {SITE_FEEDBACK_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`statuses.${value}`)}
            </option>
          ))}
        </Select>
        <Select
          label={t("filterCategory")}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{t("filterAll")}</option>
          {SITE_FEEDBACK_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {t(`categories.${value}`)}
            </option>
          ))}
        </Select>
        <Select
          label={t("filterSource")}
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">{t("filterAll")}</option>
          {SITE_FEEDBACK_SOURCES.map((value) => (
            <option key={value} value={value}>
              {t(`sources.${value}`)}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyBody")} />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <InboxCard
              key={item.id}
              item={item}
              open={openId === item.id}
              onToggle={() =>
                setOpenId((current) => (current === item.id ? null : item.id))
              }
              onSave={saveItem}
              onDelete={deleteItem}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function InboxCard({
  item,
  open,
  onToggle,
  onSave,
  onDelete,
}: {
  item: SiteFeedbackInboxItem;
  open: boolean;
  onToggle: () => void;
  onSave: (
    id: string,
    patch: { status?: SiteFeedbackStatus; stewardNote?: string | null },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const t = useTranslations("hub.siteFeedback");

  return (
    <li>
      <Card density="compact">
        <button
          type="button"
          className="flex w-full flex-col items-start gap-1 text-left"
          onClick={onToggle}
          aria-expanded={open}
        >
          <p className="font-semibold text-opseu-dark">
            {t(`categories.${item.category as SiteFeedbackCategory}`)} ·{" "}
            {t(`statuses.${item.status}`)}
          </p>
          <p className="line-clamp-2 text-sm text-gray-700">{item.body}</p>
          <p className="text-xs text-gray-500">
            {new Date(item.createdAt).toLocaleString()} ·{" "}
            {t(`sources.${item.source as SiteFeedbackSource}`)}
            {item.signedIn ? ` · ${t("signedIn")}` : ` · ${t("anonymous")}`}
          </p>
        </button>
        {open ? (
          <InboxDraft
            key={`${item.id}-${item.status}-${item.stewardNote ?? ""}`}
            item={item}
            onSave={onSave}
            onDelete={onDelete}
          />
        ) : null}
      </Card>
    </li>
  );
}

function InboxDraft({
  item,
  onSave,
  onDelete,
}: {
  item: SiteFeedbackInboxItem;
  onSave: (
    id: string,
    patch: { status?: SiteFeedbackStatus; stewardNote?: string | null },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const t = useTranslations("hub.siteFeedback");
  const [status, setStatus] = useState<SiteFeedbackStatus>(item.status);
  const [note, setNote] = useState(item.stewardNote ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
      <p className="whitespace-pre-wrap text-sm text-gray-800">{item.body}</p>
      {item.pagePath ? (
        <p className="text-sm text-gray-600">
          {t("pageLabel")}: {item.pagePath}
        </p>
      ) : null}
      {item.contactName || item.contactEmail ? (
        <p className="text-sm text-gray-600">
          {t("contactLabel")}: {[item.contactName, item.contactEmail]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : (
        <p className="text-sm text-gray-600">{t("noContact")}</p>
      )}
      <Select
        label={t("statusLabel")}
        value={status}
        onChange={(e) => setStatus(e.target.value as SiteFeedbackStatus)}
      >
        {SITE_FEEDBACK_STATUSES.map((value) => (
          <option key={value} value={value}>
            {t(`statuses.${value}`)}
          </option>
        ))}
      </Select>
      <Textarea
        label={t("noteLabel")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(item.id, {
              status,
              stewardNote: note.trim() ? note.trim() : null,
            });
            setSaving(false);
          }}
        >
          {saving ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void onDelete(item.id)}
        >
          {t("delete")}
        </Button>
      </div>
    </div>
  );
}
