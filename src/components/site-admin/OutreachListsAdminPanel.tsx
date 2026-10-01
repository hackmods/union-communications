"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

export function OutreachListsAdminPanel() {
  const t = useTranslations("outreachListsAdmin");
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
  const [searchResult, setSearchResult] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/site-admin/outreach-lists", { cache: "no-store" });
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
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch admin inventory on mount
    void load()
      .catch(() => setFeedback(t("error")))
      .finally(() => setLoading(false));
  }, [load, t]);

  async function toggleEntitlement(unionId: string, enabled: boolean) {
    setFeedback("");
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
  }

  async function search() {
    setFeedback("");
    setSearchResult("");
    if (!searchUnionId) {
      setFeedback(t("searchNeedsUnion"));
      return;
    }
    const response = await fetch("/api/site-admin/outreach-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "search",
        unionId: searchUnionId,
        email: searchEmail,
      }),
    });
    if (!response.ok) {
      setFeedback(t("searchError"));
      return;
    }
    const data = (await response.json()) as { found?: boolean; rows?: unknown[] };
    setSearchResult(
      data.found ? t("searchFound", { count: data.rows?.length ?? 0 }) : t("searchMissing"),
    );
  }

  async function setListStatus(list: ListRow, action: "pause_list" | "resume_list") {
    setFeedback("");
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
    setFeedback(t("saved"));
    await load().catch(() => setFeedback(t("error")));
  }

  async function exportAudit() {
    setFeedback("");
    if (!searchUnionId) {
      setFeedback(t("searchNeedsUnion"));
      return;
    }
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
  }

  const unionNameById = new Map(unions.map((u) => [u.id, u.name]));

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
        </Callout>
      ) : loading ? (
        <p className="text-sm text-opseu-gray-dark">{t("loading")}</p>
      ) : null}
      <section className="rounded-lg border border-opseu-gray-light p-4">
        <h2 className="text-lg font-semibold">{t("entitlementsTitle")}</h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("entitlementsHint")}</p>
        <div className="mt-3 space-y-3">
          {unions.length === 0 && !loading ? (
            <p className="text-sm text-opseu-gray-dark">{t("noUnions")}</p>
          ) : null}
          {unions.map((union) => (
            <label key={union.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={union.outreachListsEnabled}
                onChange={(e) => void toggleEntitlement(union.id, e.target.checked)}
              />
              {union.name} ({union.slug})
            </label>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-opseu-gray-light p-4">
        <h2 className="text-lg font-semibold">{t("inventoryTitle")}</h2>
        {lists.length === 0 && !loading ? (
          <p className="mt-2 text-sm text-opseu-gray-dark">{t("noLists")}</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {lists.map((list) => (
              <li key={list.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {list.name}
                  {unionNameById.get(list.unionId)
                    ? ` · ${unionNameById.get(list.unionId)}`
                    : ""}{" "}
                  · {list.status} ·{" "}
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
                    onClick={() => void setListStatus(list, "pause_list")}
                  >
                    {t("pause")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
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
      <section className="space-y-2 rounded-lg border border-opseu-gray-light p-4">
        <h2 className="text-lg font-semibold">{t("searchTitle")}</h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t("searchUnion")}</span>
          <select
            className="w-full rounded-md border border-opseu-gray-light bg-white px-3 py-2"
            value={searchUnionId}
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
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void search()}>
            {t("searchAction")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void exportAudit()}>
            {t("exportAction")}
          </Button>
        </div>
        {searchResult ? <p className="text-sm">{searchResult}</p> : null}
      </section>
      {feedback ? <p className="text-sm text-opseu-gray-dark">{feedback}</p> : null}
    </div>
  );
}
