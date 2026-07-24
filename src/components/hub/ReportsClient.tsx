"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ReportsSummary } from "@/lib/reports/aggregate";
import { defaultReportsRange } from "@/lib/reports/aggregate";
import {
  exportReportsCsv,
  exportReportsPdf,
  exportReportsXlsx,
} from "@/lib/reports/export";

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function fromDateInputStart(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function fromDateInputEnd(date: string): string {
  return `${date}T23:59:59.999Z`;
}

function CountTable({
  rows,
  keyLabel,
  valueLabel,
  empty,
}: {
  rows: { key: string; count: number }[];
  keyLabel: string;
  valueLabel: string;
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-gray-600">{empty}</p>;
  }
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-3 py-2 font-medium">{keyLabel}</th>
            <th className="px-3 py-2 font-medium">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-gray-100">
              <td className="px-3 py-2 font-mono text-xs">{row.key}</td>
              <td className="px-3 py-2">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsClient() {
  const t = useTranslations("hub");
  const defaults = defaultReportsRange();
  const initialFrom = toDateInputValue(defaults.from);
  const initialTo = toDateInputValue(defaults.to);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [appliedFrom, setAppliedFrom] = useState(initialFrom);
  const [appliedTo, setAppliedTo] = useState(initialTo);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "pdf" | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const from = fromDateInputStart(appliedFrom);
        const to = fromDateInputEnd(appliedTo);
        const res = await fetch(
          `/api/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? res.statusText);
        }
        const data = (await res.json()) as ReportsSummary;
        if (!cancelled) {
          setSummary(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setSummary(null);
          setError(e instanceof Error ? e.message : t("reportsLoadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appliedFrom, appliedTo, refreshNonce, t]);

  const runExport = async (kind: "csv" | "xlsx" | "pdf") => {
    if (!summary) return;
    setExporting(kind);
    setExportError(null);
    try {
      if (kind === "csv") await exportReportsCsv(summary);
      else if (kind === "xlsx") await exportReportsXlsx(summary);
      else await exportReportsPdf(summary, undefined, t("reportsTitle"));
    } catch (e) {
      setExportError(
        e instanceof Error ? e.message : t("reportsExportError"),
      );
    } finally {
      setExporting(null);
    }
  };

  const emptySlice =
    summary &&
    summary.grievances.total === 0 &&
    summary.bumping.total === 0 &&
    summary.time.entryCount === 0;

  return (
    <PageShell size="wide" className="py-6 md:py-8">
      <h1 className="text-2xl font-semibold text-opseu-dark">
        {t("reportsTitle")}
      </h1>
      <p className="mt-1 text-sm text-gray-600">{t("reportsSubtitle")}</p>

      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setAppliedFrom(fromDate);
          setAppliedTo(toDate);
          setRefreshNonce((n) => n + 1);
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">{t("reportsFrom")}</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">{t("reportsTo")}</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-opseu-dark px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t("reportsApply")}
        </button>
      </form>

      {summary && !loading && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!exporting}
            onClick={() => void runExport("csv")}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting === "csv" ? t("reportsExporting") : t("reportsExportCsv")}
          </button>
          <button
            type="button"
            disabled={!!exporting}
            onClick={() => void runExport("xlsx")}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting === "xlsx"
              ? t("reportsExporting")
              : t("reportsExportXlsx")}
          </button>
          <button
            type="button"
            disabled={!!exporting}
            onClick={() => void runExport("pdf")}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting === "pdf" ? t("reportsExporting") : t("reportsExportPdf")}
          </button>
        </div>
      )}

      {exportError && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {exportError}
        </p>
      )}

      {loading && (
        <div
          className="mt-6 space-y-3"
          role="status"
          aria-busy="true"
          aria-label={t("reportsLoading")}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {error && (
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && emptySlice && (
        <EmptyState className="mt-6" title={t("reportsEmpty")} />
      )}

      {!loading && !error && summary && !emptySlice && (
        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-opseu-dark">
              {t("reportsGrievances")}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {t("reportsTotal", { count: summary.grievances.total })}
            </p>
            <h3 className="mt-4 text-sm font-medium text-gray-800">
              {t("reportsByStatus")}
            </h3>
            <CountTable
              rows={summary.grievances.byStatus}
              keyLabel={t("reportsKey")}
              valueLabel={t("reportsCount")}
              empty={t("reportsNoBreakdown")}
            />
            <h3 className="mt-4 text-sm font-medium text-gray-800">
              {t("reportsByStep")}
            </h3>
            <CountTable
              rows={summary.grievances.byStep}
              keyLabel={t("reportsKey")}
              valueLabel={t("reportsCount")}
              empty={t("reportsNoBreakdown")}
            />
            <h3 className="mt-4 text-sm font-medium text-gray-800">
              {t("reportsByCategory")}
            </h3>
            <CountTable
              rows={summary.grievances.byCategory}
              keyLabel={t("reportsKey")}
              valueLabel={t("reportsCount")}
              empty={t("reportsNoBreakdown")}
            />
          </section>

          <section>
            <h2 className="text-lg font-semibold text-opseu-dark">
              {t("reportsBumping")}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {t("reportsTotal", { count: summary.bumping.total })}
            </p>
            <h3 className="mt-4 text-sm font-medium text-gray-800">
              {t("reportsByStatus")}
            </h3>
            <CountTable
              rows={summary.bumping.byStatus}
              keyLabel={t("reportsKey")}
              valueLabel={t("reportsCount")}
              empty={t("reportsNoBreakdown")}
            />
          </section>

          <section>
            <h2 className="text-lg font-semibold text-opseu-dark">
              {t("reportsTime")}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {t("reportsHoursTotal", {
                hours: summary.time.totalHours,
                count: summary.time.entryCount,
              })}
            </p>
            <h3 className="mt-4 text-sm font-medium text-gray-800">
              {t("reportsByCategory")}
            </h3>
            {summary.time.byCategory.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">
                {t("reportsNoBreakdown")}
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 font-medium">
                        {t("reportsKey")}
                      </th>
                      <th className="px-3 py-2 font-medium">
                        {t("reportsHours")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.time.byCategory.map((row) => (
                      <tr key={row.key} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono text-xs">
                          {row.key}
                        </td>
                        <td className="px-3 py-2">{row.hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}
