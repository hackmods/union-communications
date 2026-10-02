"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

interface AuditRow {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  unionId?: string;
  localId?: string;
  timestamp: string;
  outcome: "success" | "denied" | "error" | "unknown";
  requestId?: string;
}

type OutcomeFilter = "" | AuditRow["outcome"];

function buildQuery(filters: {
  from: string;
  to: string;
  actor: string;
  outcome: OutcomeFilter;
}): string {
  const params = new URLSearchParams({ limit: "200" });
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.actor.trim()) params.set("actor", filters.actor.trim());
  if (filters.outcome) params.set("outcome", filters.outcome);
  return params.toString();
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function AuditLogClient() {
  const t = useTranslations("hub");
  const outcomeLabels = {
    success: t("auditOutcome.success"),
    denied: t("auditOutcome.denied"),
    error: t("auditOutcome.error"),
    unknown: t("auditOutcome.unknown"),
  };
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actor, setActor] = useState("");
  const [outcome, setOutcome] = useState<OutcomeFilter>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQuery({ from, to, actor, outcome });
      const res = await fetch(`/api/audit?${qs}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? res.statusText);
      }
      const data = (await res.json()) as { entries: AuditRow[] };
      setEntries(data.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auditLoadError"));
    } finally {
      setLoading(false);
    }
  }, [actor, from, outcome, t, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = useCallback(() => {
    const header = [
      t("auditWhen"),
      t("auditAction"),
      t("auditOutcome.title"),
      t("auditResource"),
      t("auditUser"),
      t("auditLocal"),
    ];
    const lines = [
      header.map(escapeCsvCell).join(","),
      ...entries.map((row) =>
        [
          new Date(row.timestamp).toISOString(),
          row.action,
          outcomeLabels[row.outcome],
          `${row.resourceType}/${row.resourceId}`,
          row.userId,
          row.localId ?? "",
        ]
          .map((cell) => escapeCsvCell(String(cell)))
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "audit-log.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [entries, outcomeLabels, t]);

  const hasRows = entries.length > 0;

  const filterFields = useMemo(
    () => (
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <Input
          label={t("auditFilterFrom")}
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          label={t("auditFilterTo")}
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <Input
          label={t("auditFilterActor")}
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder={t("auditFilterActorPlaceholder")}
        />
        <Select
          label={t("auditOutcome.title")}
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as OutcomeFilter)}
        >
          <option value="">{t("auditFilterOutcomeAll")}</option>
          <option value="success">{outcomeLabels.success}</option>
          <option value="denied">{outcomeLabels.denied}</option>
          <option value="error">{outcomeLabels.error}</option>
          <option value="unknown">{outcomeLabels.unknown}</option>
        </Select>
        <Button type="button" variant="secondary" onClick={() => void load()}>
          {t("auditFilterApply")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasRows}
          onClick={exportCsv}
        >
          {t("auditExportCsv")}
        </Button>
      </div>
    ),
    [
      actor,
      exportCsv,
      from,
      hasRows,
      load,
      outcome,
      outcomeLabels,
      t,
      to,
    ],
  );

  return (
    <>
      <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
        {t("auditTitle")}
      </h1>
      <p className="mt-1 text-sm text-gray-600 sm:text-base">
        {t("auditSubtitle")}
      </p>
      {filterFields}
      {loading && (
        <div
          className="mt-6 space-y-3"
          role="status"
          aria-busy="true"
          aria-label={t("auditLoading")}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4 max-w-full" />
        </div>
      )}
      {error && (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && entries.length === 0 && (
        <EmptyState className="mt-6" title={t("auditEmpty")} />
      )}
      {hasRows && !loading && (
        <>
          <ul className="mt-6 space-y-3 md:hidden">
            {entries.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <p className="text-sm font-medium text-opseu-dark">
                  {new Date(row.timestamp).toLocaleString()}
                </p>
                <dl className="mt-2 space-y-1.5 text-xs">
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 text-gray-500">{t("auditAction")}</dt>
                    <dd className="min-w-0 break-all font-mono text-gray-800">
                      {row.action} · {outcomeLabels[row.outcome]}
                    </dd>
                  </div>
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 text-gray-500">
                      {t("auditResource")}
                    </dt>
                    <dd className="min-w-0 break-all font-mono text-gray-800">
                      {row.resourceType}/{row.resourceId}
                    </dd>
                  </div>
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 text-gray-500">{t("auditUser")}</dt>
                    <dd className="min-w-0 break-all font-mono text-gray-800">
                      {row.userId}
                    </dd>
                  </div>
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 text-gray-500">{t("auditLocal")}</dt>
                    <dd className="min-w-0 break-all font-mono text-gray-800">
                      {row.localId ?? "—"}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <div className="mt-6 hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("auditWhen")}</th>
                  <th className="px-3 py-2 font-medium">{t("auditAction")}</th>
                  <th className="px-3 py-2 font-medium">{t("auditOutcome.title")}</th>
                  <th className="px-3 py-2 font-medium">{t("auditResource")}</th>
                  <th className="px-3 py-2 font-medium">{t("auditUser")}</th>
                  <th className="px-3 py-2 font-medium">{t("auditLocal")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.action}</td>
                    <td className="px-3 py-2 text-xs">{outcomeLabels[row.outcome]}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.resourceType}/{row.resourceId}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.userId}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.localId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
