"use client";

import { downloadBlob } from "@/lib/export/image-export";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Callout } from "@/components/ui/Callout";
import {
  canEditDraftExpense,
  canElevateExpenses,
} from "@/lib/expenses/access";
import { sumLineItems } from "@/lib/expenses/totals";
import type {
  ExpensePurchaseCategory,
  ExpenseSubmission,
} from "@/types/expenses";
import type { UserRole } from "@/types/tenant";

const CATEGORIES: ExpensePurchaseCategory[] = [
  "supplies",
  "meeting",
  "printing",
  "solidarity",
  "postage",
  "other",
];

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type LineDraft = {
  date: string;
  category: ExpensePurchaseCategory;
  amount: string;
  description: string;
};

const emptyLine = (): LineDraft => ({
  date: new Date().toISOString().slice(0, 10),
  category: "supplies",
  amount: "",
  description: "",
});

export function ExpensesBoard() {
  const t = useTranslations("expenses");
  const { data: session } = useSession();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const elevated = canElevateExpenses(roles);
  const userId = session?.user?.id ?? "";

  const [items, setItems] = useState<ExpenseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [pendingExport, setPendingExport] = useState<{
    id: string;
    format: "xlsx" | "pdf" | "zip";
  } | null>(null);
  const [exportMfaCode, setExportMfaCode] = useState("");
  const [exportChallengeError, setExportChallengeError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/expenses");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as { items: ExpenseSubmission[] };
    setItems(data.items);
    setError(null);
  }

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch("/api/expenses");
      if (!res.ok) {
        setError(t("loadError"));
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { items: ExpenseSubmission[] };
      setItems(data.items);
      setError(null);
      setLoading(false);
    })();
  }, [t]);

  async function postAction(
    url: string,
    body?: unknown,
  ): Promise<boolean> {
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      setError(t("actionError"));
      return false;
    }
    await refresh();
    return true;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const lineItems = lines
      .map((line) => ({
        date: line.date,
        category: line.category,
        amount: Number(line.amount),
        description: line.description.trim(),
      }))
      .filter(
        (line) =>
          line.description &&
          Number.isFinite(line.amount) &&
          line.amount > 0,
      );
    if (!title.trim() || !purpose.trim() || lineItems.length === 0) {
      setError(t("actionError"));
      return;
    }
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), purpose: purpose.trim(), lineItems }),
    });
    if (!res.ok) {
      setError(t("createError"));
      return;
    }
    setTitle("");
    setPurpose("");
    setLines([emptyLine()]);
    setShowForm(false);
    setMessage(t("created"));
    await refresh();
  }

  async function handleExport(
    id: string,
    format: "xlsx" | "pdf" | "zip",
    mfaCode?: string,
  ) {
    if (exportBusy) return;
    setError(null);
    setExportChallengeError(null);
    if (mfaCode === undefined) {
      setPendingExport(null);
      setExportMfaCode("");
    }
    setExportBusy(true);
    try {
      const res = await fetch(`/api/expenses/${id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, ...(mfaCode ? { mfaCode } : {}) }),
      });
      if (res.status === 428) {
        setPendingExport({ id, format });
        setExportMfaCode("");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { code?: string }
          | null;
        if (body?.code === "mfa_step_up_failed") {
          setExportChallengeError(t("mfaStepUpFailed"));
        } else if (body?.code === "mfa_step_up_limited") {
          setExportChallengeError(t("mfaStepUpLimited"));
        } else if (body?.code === "mfa_step_up_unavailable") {
          setExportChallengeError(t("mfaStepUpUnavailable"));
        } else if (
          body?.code === "export_audit_unavailable" ||
          body?.code === "audit_unavailable"
        ) {
          setError(t("exportAuditUnavailable"));
        } else {
          setError(t("exportError"));
        }
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      void downloadBlob(blob, match?.[1] ?? `expense-export.${format}`);
      setPendingExport(null);
      setExportMfaCode("");
      setMessage(t("exported"));
    } catch {
      setError(t("exportError"));
    } finally {
      setExportBusy(false);
    }
  }

  function submitExportStepUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingExport || exportMfaCode.length !== 6) return;
    void handleExport(pendingExport.id, pendingExport.format, exportMfaCode);
  }

  async function handleReceiptUpload(
    submissionId: string,
    file: File,
  ): Promise<void> {
    setError(null);
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] ?? "";
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
    const res = await fetch(`/api/expenses/${submissionId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        contentBase64,
      }),
    });
    if (!res.ok) {
      setError(t("uploadError"));
      return;
    }
    setMessage(t("receiptUploaded"));
  }

  if (loading) {
    return (
      <>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-32 w-full" />
      </>
    );
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-gray-600 md:text-base">{t("subtitle")}</p>
      </header>

      <Callout className="mb-6" tone="muted">
        {t("disclaimer")}
      </Callout>

      {message && (
        <p className="mb-4 text-sm text-green-800" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <Button type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? t("cancel") : t("newSubmission")}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="mb-8 space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <Input
            label={t("fields.title")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            label={t("fields.purpose")}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">
              {t("fields.lineItems")}
            </legend>
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-md border border-gray-100 p-3 sm:grid-cols-2 lg:grid-cols-4"
              >
                <Input
                  type="date"
                  label={t("fields.lineDate")}
                  value={line.date}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, date: e.target.value } : l,
                      ),
                    )
                  }
                />
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-gray-700">
                    {t("fields.lineCategory")}
                  </span>
                  <select
                    className="min-h-11 w-full rounded-md border border-gray-300 px-3"
                    value={line.category}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx
                            ? {
                                ...l,
                                category: e.target.value as ExpensePurchaseCategory,
                              }
                            : l,
                        ),
                      )
                    }
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {t(`category.${cat}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  label={t("fields.lineAmount")}
                  value={line.amount}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, amount: e.target.value } : l,
                      ),
                    )
                  }
                />
                <Input
                  label={t("fields.lineDescription")}
                  value={line.description}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l, i) =>
                        i === idx
                          ? { ...l, description: e.target.value }
                          : l,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                {t("addLine")}
              </Button>
              {lines.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setLines((prev) => prev.slice(0, -1))}
                >
                  {t("removeLine")}
                </Button>
              )}
            </div>
          </fieldset>
          <Button type="submit">{t("saveDraft")}</Button>
        </form>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        aria-label={t("uploadReceipt")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTargetId) {
            void handleReceiptUpload(uploadTargetId, file);
          }
          e.target.value = "";
          setUploadTargetId(null);
        }}
      />

      {items.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="space-y-4">
          {items.map((submission) => {
            const canEdit = canEditDraftExpense(submission, userId, roles);
            return (
              <li
                key={submission.id}
                className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-opseu-dark">
                      {submission.title}
                    </h2>
                    <p className="text-sm text-gray-600">{submission.purpose}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {submission.submittedByName} ·{" "}
                      {t(`status.${submission.status}`)} ·{" "}
                      {t("total")}: {formatMoney(submission.totalAmount)}
                    </p>
                    {submission.deniedReason && (
                      <p className="mt-1 text-xs text-red-700">
                        {t("deniedReason")}: {submission.deniedReason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={exportBusy}
                      onClick={() => void handleExport(submission.id, "xlsx")}
                    >
                      {t("exportXlsx")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={exportBusy}
                      onClick={() => void handleExport(submission.id, "pdf")}
                    >
                      {t("exportPdf")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={exportBusy}
                      onClick={() => void handleExport(submission.id, "zip")}
                    >
                      {t("exportZip")}
                    </Button>
                  </div>
                </div>

                {pendingExport?.id === submission.id && (
                  <form
                    className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3"
                    onSubmit={submitExportStepUp}
                    aria-labelledby={`expense-export-mfa-${submission.id}`}
                  >
                    <div>
                      <h3
                        id={`expense-export-mfa-${submission.id}`}
                        className="font-semibold text-amber-950"
                      >
                        {t("mfaStepUpTitle")}
                      </h3>
                      <p className="text-sm text-amber-900">
                        {t("mfaStepUpHint", {
                          title: submission.title,
                          format:
                            pendingExport.format === "xlsx"
                              ? t("exportXlsx")
                              : pendingExport.format === "pdf"
                                ? t("exportPdf")
                                : t("exportZip"),
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label className="min-w-0 flex-1 text-sm font-medium text-amber-950">
                        {t("mfaCode")}
                        <input
                          autoFocus
                          required
                          type="password"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          disabled={exportBusy}
                          aria-describedby={
                            exportChallengeError
                              ? `expense-export-mfa-error-${submission.id}`
                              : undefined
                          }
                          className="mt-1 min-h-10 w-full rounded-md border border-amber-400 bg-white px-3 text-base text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                          value={exportMfaCode}
                          onChange={(event) =>
                            setExportMfaCode(event.target.value.replace(/\D/g, ""))
                          }
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="submit"
                          disabled={exportBusy || exportMfaCode.length !== 6}
                        >
                          {t("mfaStepUpVerify")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={exportBusy}
                          onClick={() => {
                            setPendingExport(null);
                            setExportMfaCode("");
                            setExportChallengeError(null);
                          }}
                        >
                          {t("cancel")}
                        </Button>
                      </div>
                    </div>
                    {exportChallengeError && (
                      <p
                        id={`expense-export-mfa-error-${submission.id}`}
                        className="text-sm text-red-800"
                        role="alert"
                      >
                        {exportChallengeError}
                      </p>
                    )}
                  </form>
                )}

                <ul className="divide-y divide-gray-100 text-sm">
                  {submission.lineItems.map((line) => (
                    <li
                      key={line.id}
                      className="flex flex-wrap justify-between gap-2 py-2"
                    >
                      <span>
                        {line.date} · {t(`category.${line.category}`, { defaultValue: line.category })} ·{" "}
                        {line.description}
                      </span>
                      <span className="font-medium">
                        {formatMoney(line.amount)}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between py-2 font-semibold">
                    <span>{t("total")}</span>
                    <span>{formatMoney(sumLineItems(submission.lineItems))}</span>
                  </li>
                </ul>

                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setUploadTargetId(submission.id);
                        fileInputRef.current?.click();
                      }}
                    >
                      {t("uploadReceipt")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        if (
                          await postAction(`/api/expenses/${submission.id}/submit`)
                        ) {
                          setMessage(t("submitted"));
                        }
                      }}
                    >
                      {t("submitForApproval")}
                    </Button>
                  </div>
                )}

                {elevated && submission.status === "submitted" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        if (
                          await postAction(
                            `/api/expenses/${submission.id}/approve`,
                          )
                        ) {
                          setMessage(t("approved"));
                        }
                      }}
                    >
                      {t("approve")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        if (
                          await postAction(`/api/expenses/${submission.id}/deny`, {})
                        ) {
                          setMessage(t("denied"));
                        }
                      }}
                    >
                      {t("deny")}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
