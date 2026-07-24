"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LedgerEntryType } from "@/types/ledger";
import type { LedgerEntryWithBalance } from "@/lib/ledger/running-balance";

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: LedgerEntryWithBalance[]): string {
  const header =
    "date,type,category,description,amount,running_balance,recorded_by_id,id";
  const lines = rows.map((e) => {
    const cols = [
      e.date,
      e.type,
      e.category,
      e.description.replace(/"/g, '""'),
      e.amount.toFixed(2),
      e.runningBalance.toFixed(2),
      e.recordedById,
      e.id,
    ];
    return cols.map((c) => `"${c}"`).join(",");
  });
  return [header, ...lines].join("\n");
}

export function LedgerBoard() {
  const t = useTranslations("ledger");
  const [entries, setEntries] = useState<LedgerEntryWithBalance[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<LedgerEntryType>("expense");
  const [category, setCategory] = useState("general");

  async function refresh() {
    const res = await fetch("/api/ledger");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as {
      entries: LedgerEntryWithBalance[];
      balance: number;
    };
    setEntries(data.entries);
    setBalance(data.balance);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/ledger");
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as {
          entries: LedgerEntryWithBalance[];
          balance: number;
        };
        if (!cancelled) {
          setEntries(data.entries);
          setBalance(data.balance);
        }
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t("createError"));
      return;
    }
    const res = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        description: description.trim(),
        amount: parsedAmount,
        type,
        category: category.trim() || "general",
      }),
    });
    if (res.ok) {
      setDescription("");
      setAmount("");
      setCategory("general");
      setShowForm(false);
      setMessage(t("created"));
      await refresh();
    } else {
      setError(t("createError"));
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/ledger/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage(t("deleted"));
      await refresh();
    } else {
      setError(t("deleteError"));
    }
  }

  function exportCsv() {
    setExportError(null);
    try {
      const csv = toCsv(entries);
      downloadBlob(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        "discretionary-fund-ledger.csv",
      );
    } catch {
      setExportError(t("exportError"));
    }
  }

  async function exportXlsx() {
    setExportError(null);
    try {
      const excelMod = await import("exceljs");
      const ExcelNS = (excelMod.default ?? excelMod) as typeof import("exceljs");
      const workbook = new ExcelNS.Workbook();
      const sheet = workbook.addWorksheet(t("sheetName"));
      sheet.columns = [
        { header: t("colDate"), key: "date", width: 14 },
        { header: t("colType"), key: "type", width: 10 },
        { header: t("colCategory"), key: "category", width: 16 },
        { header: t("colDescription"), key: "description", width: 40 },
        { header: t("colAmount"), key: "amount", width: 12 },
        { header: t("colBalance"), key: "runningBalance", width: 14 },
      ];
      for (const row of entries) {
        sheet.addRow({
          date: row.date,
          type: row.type,
          category: row.category,
          description: row.description,
          amount: row.amount,
          runningBalance: row.runningBalance,
        });
      }
      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(
        new Blob([new Uint8Array(buffer as ArrayBuffer)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "discretionary-fund-ledger.xlsx",
      );
    } catch {
      setExportError(t("exportError"));
    }
  }

  return (
    <PageShell size="wide" className="py-6 md:py-8">
      <h1 className="text-2xl font-semibold text-opseu-dark">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
      <p className="mt-2 text-xs text-gray-500">{t("disclaimer")}</p>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {t("balanceLabel")}
          </p>
          <p className="text-2xl font-semibold text-opseu-dark">
            {formatMoney(balance)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            {t("exportCsv")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void exportXlsx()}
          >
            {t("exportXlsx")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? t("cancel") : t("newEntry")}
          </Button>
        </div>
      </div>

      {exportError && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {exportError}
        </p>
      )}
      {message && (
        <p className="mt-3 text-sm text-green-800" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="mt-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colDate")}
            </span>
            <Input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colType")}
            </span>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as LedgerEntryType)}
            >
              <option value="income">{t("typeIncome")}</option>
              <option value="expense">{t("typeExpense")}</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colCategory")}
            </span>
            <Input
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colAmount")}
            </span>
            <Input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colDescription")}
            </span>
            <Input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">{t("save")}</Button>
          </div>
        </form>
      )}

      {loading && (
        <div
          className="mt-6 space-y-3"
          role="status"
          aria-busy="true"
          aria-label={t("loading")}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4 max-w-full" />
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <EmptyState className="mt-6" title={t("empty")} />
      )}

      {entries.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 font-medium">{t("colDate")}</th>
                <th className="px-3 py-2 font-medium">{t("colType")}</th>
                <th className="px-3 py-2 font-medium">{t("colCategory")}</th>
                <th className="px-3 py-2 font-medium">{t("colDescription")}</th>
                <th className="px-3 py-2 font-medium text-right">
                  {t("colAmount")}
                </th>
                <th className="px-3 py-2 font-medium text-right">
                  {t("colBalance")}
                </th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">{t("actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                    {row.date.slice(0, 10)}
                  </td>
                  <td className="px-3 py-2">
                    {row.type === "income"
                      ? t("typeIncome")
                      : t("typeExpense")}
                  </td>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="px-3 py-2">{row.description}</td>
                  <td
                    className={`px-3 py-2 text-right font-mono text-xs ${
                      row.type === "income"
                        ? "text-green-800"
                        : "text-red-800"
                    }`}
                  >
                    {row.type === "income" ? "+" : "−"}
                    {formatMoney(row.amount)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatMoney(row.runningBalance)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(row.id)}
                    >
                      {t("delete")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
