"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";

const inputClass = "min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm";

type ReportResult = {
  view: string;
  asOf: string;
  columns: string[];
  rows: Array<Record<string, string>>;
  total: number;
  datasetName?: string;
};

type Props = {
  request: <T>(url: string, init?: RequestInit) => Promise<T>;
  datasets: Array<{ id: string; name: string; kind: string }>;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setMessage: (value: string) => void;
};

export function ReportsPanel({ request, datasets, busy, setBusy, setMessage }: Props) {
  const t = useTranslations("dataWorkbench");
  const [view, setView] = useState("people_as_of");
  const [asOf, setAsOf] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [report, setReport] = useState<ReportResult | null>(null);

  async function runReport(format: "json" | "csv") {
    setBusy(true);
    setMessage("");
    try {
      if (format === "csv") {
        const response = await fetch("/api/data/reports/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            view,
            asOf: asOf || undefined,
            datasetId: view === "dataset_revision" ? datasetId : undefined,
            format: "csv",
          }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? t("requestFailed"));
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `unionops-data-${view}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
        setMessage(t("reportExported"));
        return;
      }
      const result = await request<{ report: ReportResult }>("/api/data/reports/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          view,
          asOf: asOf || undefined,
          datasetId: view === "dataset_revision" ? datasetId : undefined,
          format: "json",
        }),
      });
      setReport(result.report);
      setMessage(t("reportReady", { count: result.report.total }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card density="compact" className="space-y-4">
        <CardTitle>{t("reports")}</CardTitle>
        <p className="max-w-3xl text-sm text-gray-700">{t("reportsIntro")}</p>
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t("duesObservationalNote")}
        </p>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_10rem_1fr_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void runReport("json");
          }}
        >
          <label className="block space-y-1 text-sm">
            <span>{t("reportView")}</span>
            <select
              className={inputClass}
              value={view}
              onChange={(event) => {
                setView(event.target.value);
                setReport(null);
              }}
            >
              <option value="people_as_of">{t("reportViews.people_as_of")}</option>
              <option value="assignments_as_of">{t("reportViews.assignments_as_of")}</option>
              <option value="dues_standing_snapshot">{t("reportViews.dues_standing_snapshot")}</option>
              <option value="dataset_revision">{t("reportViews.dataset_revision")}</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>{t("asOfDate")}</span>
            <input className={inputClass} type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
          </label>
          {view === "dataset_revision" ? (
            <label className="block space-y-1 text-sm">
              <span>{t("chooseDataset")}</span>
              <select className={inputClass} value={datasetId} onChange={(event) => setDatasetId(event.target.value)} required>
                <option value="">{t("chooseDataset")}</option>
                {datasets.filter((dataset) => dataset.kind === "table").map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <div />
          )}
          <div className="flex items-end">
            <Button type="submit" disabled={busy || (view === "dataset_revision" && !datasetId)}>{t("runReport")}</Button>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy || (view === "dataset_revision" && !datasetId)}
              onClick={() => void runReport("csv")}
            >
              {t("exportCsv")}
            </Button>
          </div>
        </form>
      </Card>

      {report && (
        <Card density="compact" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <CardTitle>{t(`reportViews.${report.view}` as "reportViews.people_as_of")}</CardTitle>
            <p className="text-sm text-gray-600">{t("reportReady", { count: report.total })} · {report.asOf}</p>
          </div>
          {report.rows.length === 0 ? (
            <p className="text-sm text-gray-600">{t("reportEmpty")}</p>
          ) : (
            <div className="max-h-[32rem] overflow-auto rounded-md border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    {report.columns.map((column) => (
                      <th key={column} className="p-2">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.slice(0, 200).map((row, index) => (
                    <tr key={index} className="border-t border-gray-100">
                      {report.columns.map((column) => (
                        <td key={column} className="max-w-48 truncate p-2" title={row[column]}>
                          {row[column] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {report.total > 200 && <p className="text-xs text-gray-600">{t("reportPreviewCap")}</p>}
        </Card>
      )}
    </div>
  );
}
