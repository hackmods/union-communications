"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
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
  metadata?: Record<string, string>;
}

type OutcomeFilter = "" | AuditRow["outcome"];

type AuditFilters = {
  from: string;
  to: string;
  actor: string;
  outcome: OutcomeFilter;
};

const EMPTY_FILTERS: AuditFilters = {
  from: "",
  to: "",
  actor: "",
  outcome: "",
};

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function filtersActive(filters: AuditFilters): boolean {
  return Boolean(
    filters.from || filters.to || filters.actor.trim() || filters.outcome,
  );
}

function endOfDayIso(dateValue: string): number {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return Number.NaN;
  // HTML date inputs are calendar days; include the full local day.
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function startOfDayIso(dateValue: string): number {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return Number.NaN;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function filterEntries(entries: AuditRow[], filters: AuditFilters): AuditRow[] {
  let result = entries;
  if (filters.from) {
    const fromMs = startOfDayIso(filters.from);
    if (!Number.isNaN(fromMs)) {
      result = result.filter((e) => new Date(e.timestamp).getTime() >= fromMs);
    }
  }
  if (filters.to) {
    const toMs = endOfDayIso(filters.to);
    if (!Number.isNaN(toMs)) {
      result = result.filter((e) => new Date(e.timestamp).getTime() <= toMs);
    }
  }
  if (filters.actor.trim()) {
    const needle = filters.actor.trim().toLowerCase();
    result = result.filter((e) => e.userId.toLowerCase().includes(needle));
  }
  if (filters.outcome) {
    result = result.filter((e) => e.outcome === filters.outcome);
  }
  return result;
}

export function OperatorAuditClient() {
  const t = useTranslations("hub.platformOperator");
  const tOutcome = useTranslations("hub.auditOutcome");
  const outcomeLabels = {
    success: tOutcome("success"),
    denied: tOutcome("denied"),
    error: tOutcome("error"),
    unknown: tOutcome("unknown"),
  };
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [draft, setDraft] = useState<AuditFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<AuditFilters>(EMPTY_FILTERS);

  const load = useCallback(
    async (code?: string, isCurrent: () => boolean = () => true) => {
      if (isCurrent()) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch("/api/site-admin/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            limit: 200,
            ...(code ? { mfaCode: code } : {}),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          entries?: AuditRow[];
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          if (!isCurrent()) return;
          if (data.code === "mfa_step_up_required") {
            setStepUpRequired(true);
            setUnlocked(false);
            setError(t("operatorAuditMfaRequired"));
          } else if (data.code === "mfa_step_up_failed") {
            setStepUpRequired(true);
            setUnlocked(false);
            setMfaCode("");
            setError(t("operatorAuditMfaFailed"));
          } else if (data.code === "mfa_step_up_limited") {
            setStepUpRequired(true);
            setUnlocked(false);
            setMfaCode("");
            setError(t("operatorAuditMfaLimited"));
          } else if (
            data.code === "mfa_step_up_unavailable" ||
            data.code === "audit_unavailable"
          ) {
            setStepUpRequired(false);
            setUnlocked(false);
            setMfaCode("");
            setError(t("operatorAuditUnavailable"));
          } else if (data.code === "audit_read_result_unconfirmed") {
            setStepUpRequired(false);
            setUnlocked(false);
            setMfaCode("");
            setError(t("operatorAuditUnconfirmed"));
          } else {
            setStepUpRequired(false);
            setUnlocked(false);
            setError(data.error ?? t("operatorAuditLoadError"));
          }
          return;
        }
        if (!isCurrent()) return;
        setEntries(data.entries ?? []);
        setStepUpRequired(false);
        setMfaCode("");
        setUnlocked(true);
      } catch {
        if (isCurrent()) {
          setUnlocked(false);
          setError(t("operatorAuditLoadError"));
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    // The first load is initiated after mount; `load` owns the request state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(undefined, () => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  function submitChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(mfaCode);
  }

  function applyFilters() {
    setApplied(draft);
  }

  function clearFilters() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  }

  const visible = useMemo(
    () => filterEntries(entries, applied),
    [entries, applied],
  );
  const filteredEmpty =
    unlocked &&
    !loading &&
    !error &&
    entries.length > 0 &&
    visible.length === 0 &&
    filtersActive(applied);

  function exportCsv() {
    const header = [
      t("operatorAuditWhen"),
      t("operatorAuditAction"),
      t("operatorAuditActor"),
      t("operatorAuditResource"),
      t("operatorAuditOutcome"),
      t("operatorAuditRequestId"),
      t("operatorAuditMeta"),
    ];
    const lines = [
      header.map(escapeCsvCell).join(","),
      ...visible.map((row) =>
        [
          new Date(row.timestamp).toISOString(),
          row.action,
          row.userId,
          `${row.resourceType}/${row.resourceId}${row.unionId ? ` · ${row.unionId}` : ""}`,
          outcomeLabels[row.outcome],
          row.requestId ?? "",
          row.metadata
            ? Object.entries(row.metadata)
                .map(([k, v]) => `${k}=${v}`)
                .join(" ")
            : "",
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
    anchor.download = "operator-audit.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const showFilters = unlocked && !stepUpRequired;

  return (
    <>
      <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
        {t("operatorAuditTitle")}
      </h1>
      <p className="mt-1 text-sm text-gray-600 sm:text-base">
        {t("operatorAuditSubtitle")}
      </p>
      {stepUpRequired ? (
        <form
          onSubmit={submitChallenge}
          className="mt-4 max-w-md space-y-3 rounded-lg border border-amber-700/20 bg-amber-50 p-4"
        >
          <Callout tone="warning">{t("operatorAuditMfaHelp")}</Callout>
          <Input
            label={t("operatorAuditMfaLabel")}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            autoComplete="one-time-code"
            maxLength={32}
            autoFocus
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !mfaCode.trim()}>
            {loading ? t("operatorAuditLoading") : t("operatorAuditMfaSubmit")}
          </Button>
        </form>
      ) : null}
      {showFilters ? (
        <>
          <p className="mt-4 text-sm text-gray-600">{t("operatorAuditFilterNote")}</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <Input
              label={t("operatorAuditFilterFrom")}
              type="date"
              value={draft.from}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, from: e.target.value }))
              }
            />
            <Input
              label={t("operatorAuditFilterTo")}
              type="date"
              value={draft.to}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, to: e.target.value }))
              }
            />
            <Input
              label={t("operatorAuditFilterActor")}
              value={draft.actor}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, actor: e.target.value }))
              }
              placeholder={t("operatorAuditFilterActorPlaceholder")}
            />
            <Select
              label={t("operatorAuditOutcome")}
              value={draft.outcome}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  outcome: e.target.value as OutcomeFilter,
                }))
              }
            >
              <option value="">{t("operatorAuditFilterOutcomeAll")}</option>
              <option value="success">{outcomeLabels.success}</option>
              <option value="denied">{outcomeLabels.denied}</option>
              <option value="error">{outcomeLabels.error}</option>
              <option value="unknown">{outcomeLabels.unknown}</option>
            </Select>
            <Button type="button" variant="secondary" onClick={applyFilters}>
              {t("operatorAuditFilterApply")}
            </Button>
            {filtersActive(draft) || filtersActive(applied) ? (
              <Button type="button" variant="outline" onClick={clearFilters}>
                {t("operatorAuditFilterClear")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={visible.length === 0}
              onClick={exportCsv}
            >
              {t("operatorAuditExportCsv")}
            </Button>
          </div>
        </>
      ) : null}
      {loading && (
        <div
          className="mt-6 space-y-3"
          role="status"
          aria-busy="true"
          aria-label={t("operatorAuditLoading")}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      {error && (
        <div className="mt-6 max-w-2xl space-y-2">
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
          {!stepUpRequired ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void load()}
            >
              {t("operatorAuditRetry")}
            </Button>
          ) : null}
        </div>
      )}
      {!loading && !error && unlocked && entries.length === 0 && (
        <EmptyState className="mt-6" title={t("operatorAuditEmpty")} />
      )}
      {filteredEmpty ? (
        <EmptyState
          className="mt-6"
          title={t("operatorAuditEmptyFiltered")}
          action={
            <Button type="button" variant="outline" onClick={clearFilters}>
              {t("operatorAuditFilterClear")}
            </Button>
          }
        />
      ) : null}
      {visible.length > 0 && !loading && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("operatorAuditWhen")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("operatorAuditAction")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("operatorAuditActor")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("operatorAuditResource")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("operatorAuditOutcome")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("operatorAuditRequestId")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("operatorAuditMeta")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-opseu-dark">
                    {row.action}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">
                    {row.userId}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">
                    {row.resourceType}/{row.resourceId}
                    {row.unionId ? ` · ${row.unionId}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    {outcomeLabels[row.outcome]}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">
                    {row.requestId ?? "—"}
                  </td>
                  <td className="max-w-xs truncate px-3 py-2 font-mono text-xs text-gray-600">
                    {row.metadata
                      ? Object.entries(row.metadata)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(" ")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
