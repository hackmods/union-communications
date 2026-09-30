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
  const [unions, setUnions] = useState<UnionRow[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [searchUnionId, setSearchUnionId] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<string>("");
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/site-admin/outreach-lists", { cache: "no-store" });
    if (!response.ok) throw new Error("load");
    const data = (await response.json()) as {
      config: typeof config;
      unions: UnionRow[];
      lists: ListRow[];
    };
    setConfig(data.config);
    setUnions(data.unions);
    setLists(data.lists);
    if (data.unions[0]?.id) setSearchUnionId(data.unions[0].id);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch admin inventory on mount
    void load().catch(() => setFeedback(t("error")));
  }, [load, t]);

  async function toggleEntitlement(unionId: string, enabled: boolean) {
    const response = await fetch("/api/site-admin/outreach-lists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unionId, outreachListsEnabled: enabled }),
    });
    if (!response.ok) {
      setFeedback(t("error"));
      return;
    }
    setFeedback(t("saved"));
    await load();
  }

  async function search() {
    const response = await fetch("/api/site-admin/outreach-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "search",
        unionId: searchUnionId,
        email: searchEmail,
      }),
    });
    const data = (await response.json()) as { found?: boolean; rows?: unknown[] };
    setSearchResult(
      data.found ? t("searchFound", { count: data.rows?.length ?? 0 }) : t("searchMissing"),
    );
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
        </Callout>
      ) : null}
      <section className="rounded-lg border border-opseu-gray-light p-4">
        <h2 className="text-lg font-semibold">{t("entitlementsTitle")}</h2>
        <div className="mt-3 space-y-3">
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
        <ul className="mt-2 space-y-1 text-sm">
          {lists.map((list) => (
            <li key={list.id}>
              {list.name} · {list.status} · {t("listCounts", {
                confirmed: list.confirmed,
                pending: list.pending,
                suppressed: list.suppressed,
              })}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2 rounded-lg border border-opseu-gray-light p-4">
        <h2 className="text-lg font-semibold">{t("searchTitle")}</h2>
        <Input value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} label={t("searchEmail")} />
        <Button type="button" onClick={() => void search()}>{t("searchAction")}</Button>
        {searchResult ? <p className="text-sm">{searchResult}</p> : null}
      </section>
      {feedback ? <p className="text-sm text-opseu-gray-dark">{feedback}</p> : null}
    </div>
  );
}
