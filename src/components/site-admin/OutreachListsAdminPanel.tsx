"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Callout } from "@/components/ui/Callout";

type UnionRow = { id: string; name: string; slug: string; outreachListsEnabled: boolean };
type ListRow = {
  id: string;
  unionId: string;
  name: string;
  slug: string;
  status: string;
  confirmed: number;
  pending: number;
  suppressed: number;
};
type SearchRow = {
  id: string;
  listId: string;
  status: string;
  locale: string;
  wordingVersion: string | null;
  createdAt: string;
};

export function OutreachListsAdminPanel() {
  const t = useTranslations("outreachListsAdmin");
  const unionSelectId = useId();
  const [config, setConfig] = useState<{
    enabled: boolean;
    reason: string | null;
    noticeVersion: string;
    approvalReferencePresent: boolean;
  } | null>(null);
  const [hostEnabled, setHostEnabled] = useState<boolean | null>(null);
  const [durable, setDurable] = useState<boolean | null>(null);
  const [unions, setUnions] = useState<UnionRow[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [searchUnionId, setSearchUnionId] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchRows, setSearchRows] = useState<SearchRow[] | null>(null);
  const [searchSummary, setSearchSummary] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/site-admin/outreach-lists", { cache: "no-store" });
    if (response.status === 403) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error?.toLowerCase().includes("mfa") ? "mfa" : "forbidden");
    }
    if (!response.ok) throw new Error("load");
    const data = (await response.json()) as {
      config: typeof config;
      durable?: boolean;
      host?: { outreach_lists?: boolean };
      unions: UnionRow[];
      lists: ListRow[];
    };
    setConfig(data.config);
    setDurable(data.durable === true);
    setHostEnabled(data.host?.outreach_lists === true);
    setUnions(data.unions);
    setLists(data.lists);
    setSearchUnionId((current) => {
      if (current && data.unions.some((u) => u.id === current)) return current;
      return data.unions[0]?.id ?? "";
    });
    setLoadFailed(false);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setFeedback("");
    setLoadFailed(false);
    try {
      await load();
    } catch (error) {
      setLoadFailed(true);
      setFeedback(
        error instanceof Error && error.message === "mfa" ? t("mfaRequired") : t("error"),
      );
    } finally {
      setLoading(false);
    }
  }, [load, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch admin inventory on mount
    void reload();
  }, [reload]);

  async function toggleEntitlement(unionId: string, enabled: boolean) {
    if (busy || durable === false) return;
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/site-admin/outreach-lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unionId, outreachListsEnabled: enabled }),
      });
      if (!response.ok) {
        setFeedback(t("saveError"));
        return;
      }
      setFeedback(t("saved"));
      await load().catch(() => setFeedback(t("error")));
    } finally {
      setBusy(false);
    }
  }

  async function search() {
    if (busy) return;
    setFeedback("");
    setSearchSummary("");
    setSearchRows(null);
    if (!searchUnionId) {
      setFeedback(t("searchNeedsUnion"));
      return;
    }
    if (!searchEmail.trim()) {
      setFeedback(t("searchNeedsEmail"));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/site-admin/outreach-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          unionId: searchUnionId,
          email: searchEmail.trim(),
        }),
      });
      if (!response.ok) {
        setFeedback(t("searchError"));
        return;
      }
      const data = (await response.json()) as { found?: boolean; rows?: SearchRow[] };
      if (data.found && data.rows?.length) {
        setSearchRows(data.rows);
        setSearchSummary(t("searchFound", { count: data.rows.length }));
      } else {
        setSearchRows([]);
        setSearchSummary(t("searchMissing"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function setListStatus(list: ListRow, action: "pause_list" | "resume_list") {
    if (busy || durable === false) return;
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/site-admin/outreach-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          unionId: list.unionId,
          listId: list.id,
        }),
      });
      if (!response.ok) {
        setFeedback(t("saveError"));
        return;
      }
      setFeedback(
        action === "pause_list" ? t("paused") : t("resumed"),
      );
      await load().catch(() => setFeedback(t("error")));
    } finally {
      setBusy(false);
    }
  }

  async function exportAudit() {
    if (busy) return;
    setFeedback("");
    if (!searchUnionId) {
      setFeedback(t("searchNeedsUnion"));
      return;
    }
    if (durable === false) {
      setFeedback(t("needsPostgres"));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/site-admin/outreach-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_audit", unionId: searchUnionId }),
      });
      if (!response.ok) {
        setFeedback(t("exportError"));
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "outreach-lists-audit.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback(t("exported"));
    } finally {
      setBusy(false);
    }
  }

  const unionNameById = new Map(unions.map((u) => [u.id, u.name]));
  const listNameById = new Map(lists.map((list) => [list.id, list.name]));
  const writesBlocked = durable === false || busy || loading;

  function statusLabel(status: string): string {
    if (status === "active") return t("statusActive");
    if (status === "paused") return t("statusPaused");
    if (status === "confirmed") return t("statusConfirmed");
    if (status === "pending_confirmation") return t("statusPending");
    if (status === "suppressed") return t("statusSuppressed");
    return status;
  }

  return (
    <div className="space-y-6">
      {config ? (
        <Callout tone={config.enabled ? "success" : "warning"}>
          <p className="font-medium">{t("readiness")}</p>
          <p className="mt-1 text-sm">
            {config.enabled
              ? t("enabled")
              : t("disabled", { reason: config.reason ?? "disabled" })}
          </p>
          <p className="mt-2 text-sm">
            {t("approvalMeta", {
              version: config.noticeVersion,
              reference: config.approvalReferencePresent ? t("yes") : t("no"),
            })}
          </p>
          {hostEnabled !== null ? (
            <p className="mt-2 text-sm">
              {t("hostFlag", { value: hostEnabled ? t("yes") : t("no") })}
            </p>
          ) : null}
          {durable === false ? (
            <p className="mt-2 text-sm">{t("needsPostgres")}</p>
          ) : null}
          {(hostEnabled === false || !config.enabled) ? (
            <p className="mt-3 text-sm">
              <Link
                href="/app/site-admin/host"
                className="font-medium text-opseu-blue underline"
              >
                {t("openHostReadiness")}
              </Link>
              {" · "}
              <Link
                href="/app/site-admin/email"
                className="font-medium text-opseu-blue underline"
              >
                {t("openEmailOps")}
              </Link>
            </p>
          ) : null}
        </Callout>
      ) : loading ? (
        <p className="text-sm text-opseu-gray-dark">{t("loading")}</p>
      ) : loadFailed ? (
        <Callout tone="warning">
          <p className="text-sm">{feedback || t("error")}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={() => void reload()}
            disabled={busy}
          >
            {t("retry")}
          </Button>
        </Callout>
      ) : null}

      <section className="rounded-lg border border-opseu-gray-light p-4">
        <h2 className="text-lg font-semibold">{t("entitlementsTitle")}</h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("entitlementsHint")}</p>
        {durable === false ? (
          <p className="mt-2 text-sm text-opseu-gray-dark">{t("entitlementsNeedPostgres")}</p>
        ) : null}
        <div className="mt-3 space-y-3">
          {unions.length === 0 && !loading && !loadFailed ? (
            <p className="text-sm text-opseu-gray-dark">
              {t("noUnions")}{" "}
              <Link
                href="/app/site-admin/organization"
                className="font-medium text-opseu-blue underline"
              >
                {t("openOrganization")}
              </Link>
            </p>
          ) : null}
          {unions.map((union) => (
            <label key={union.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={union.outreachListsEnabled}
                disabled={writesBlocked}
                onChange={(e) => void toggleEntitlement(union.id, e.target.checked)}
              />
              {union.name} ({union.slug})
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-opseu-gray-light p-4">
        <h2 className="text-lg font-semibold">{t("inventoryTitle")}</h2>
        {lists.length === 0 && !loading && !loadFailed ? (
          <p className="mt-2 text-sm text-opseu-gray-dark">{t("noLists")}</p>
        ) : (
          <ul className="mt-2 space-y-3 text-sm">
            {lists.map((list) => (
              <li
                key={list.id}
                className="flex flex-col gap-2 border-b border-opseu-gray-light pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              >
                <span>
                  <span className="font-medium">{list.name}</span>
                  {unionNameById.get(list.unionId)
                    ? ` · ${unionNameById.get(list.unionId)}`
                    : ""}{" "}
                  · {statusLabel(list.status)} ·{" "}
                  {t("listCounts", {
                    confirmed: list.confirmed,
                    pending: list.pending,
                    suppressed: list.suppressed,
                  })}
                </span>
                {list.status === "active" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={writesBlocked}
                    onClick={() => void setListStatus(list, "pause_list")}
                  >
                    {t("pause")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={writesBlocked}
                    onClick={() => void setListStatus(list, "resume_list")}
                  >
                    {t("resume")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-opseu-gray-light p-4">
        <h2 className="text-lg font-semibold">{t("searchTitle")}</h2>
        <p className="text-sm text-opseu-gray-dark">{t("searchHint")}</p>
        <label className="block text-sm" htmlFor={unionSelectId}>
          <span className="mb-1 block font-medium">{t("searchUnion")}</span>
          <select
            id={unionSelectId}
            className="w-full rounded-md border border-opseu-gray-light bg-white px-3 py-2 disabled:opacity-50"
            value={searchUnionId}
            disabled={unions.length === 0 || busy || loading}
            onChange={(e) => setSearchUnionId(e.target.value)}
          >
            {unions.map((union) => (
              <option key={union.id} value={union.id}>
                {union.name} ({union.slug})
              </option>
            ))}
          </select>
        </label>
        <Input
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          label={t("searchEmail")}
          type="email"
          autoComplete="email"
          disabled={busy || loading || durable === false}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void search()}
            disabled={busy || loading || durable === false || !searchUnionId}
          >
            {t("searchAction")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void exportAudit()}
            disabled={busy || loading || durable === false || !searchUnionId}
          >
            {t("exportAction")}
          </Button>
        </div>
        {searchSummary ? <p className="text-sm">{searchSummary}</p> : null}
        {searchRows && searchRows.length > 0 ? (
          <ul className="space-y-2 rounded-md border border-opseu-gray-light bg-opseu-gray-light/20 p-3 text-sm">
            {searchRows.map((row) => (
              <li key={row.id}>
                {listNameById.get(row.listId) ?? row.listId}
                {" · "}
                {statusLabel(row.status)}
                {" · "}
                {row.locale.toUpperCase()}
                {row.wordingVersion ? ` · ${row.wordingVersion}` : ""}
                {" · "}
                {new Date(row.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {feedback && !loadFailed ? (
        <p role="status" aria-live="polite" className="text-sm text-opseu-gray-dark">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
