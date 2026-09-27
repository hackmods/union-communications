"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";
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

export function OperatorAuditClient() {
  const t = useTranslations("hub.platformOperator");
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  const load = useCallback(async (
    code?: string,
    isCurrent: () => boolean = () => true,
  ) => {
    if (isCurrent()) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch("/api/site-admin/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ limit: 100, ...(code ? { mfaCode: code } : {}) }),
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
          setError(t("operatorAuditMfaRequired"));
        } else if (data.code === "mfa_step_up_failed") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("operatorAuditMfaFailed"));
        } else if (data.code === "mfa_step_up_limited") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("operatorAuditMfaLimited"));
        } else if (
          data.code === "mfa_step_up_unavailable" ||
          data.code === "audit_unavailable"
        ) {
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("operatorAuditUnavailable"));
        } else if (data.code === "audit_read_result_unconfirmed") {
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("operatorAuditUnconfirmed"));
        } else {
          setStepUpRequired(false);
          setError(data.error ?? t("operatorAuditLoadError"));
        }
        return;
      }
      if (!isCurrent()) return;
      setEntries(data.entries ?? []);
      setStepUpRequired(false);
      setMfaCode("");
    } catch {
      if (isCurrent()) setError(t("operatorAuditLoadError"));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void load(undefined, () => !cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  function submitChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load(mfaCode);
  }

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
          <p className="text-sm text-red-700" role="alert">{error}</p>
          {!stepUpRequired ? (
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
              {t("operatorAuditRetry")}
            </Button>
          ) : null}
        </div>
      )}
      {!loading && !error && entries.length === 0 && (
        <EmptyState className="mt-6" title={t("operatorAuditEmpty")} />
      )}
      {entries.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">{t("operatorAuditWhen")}</th>
                <th className="px-3 py-2 font-medium">{t("operatorAuditAction")}</th>
                <th className="px-3 py-2 font-medium">{t("operatorAuditActor")}</th>
                <th className="px-3 py-2 font-medium">{t("operatorAuditResource")}</th>
                <th className="px-3 py-2 font-medium">{t("operatorAuditOutcome")}</th>
                <th className="px-3 py-2 font-medium">{t("operatorAuditRequestId")}</th>
                <th className="px-3 py-2 font-medium">{t("operatorAuditMeta")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {entries.map((row) => (
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
                  <td className="px-3 py-2 text-xs text-gray-700">{row.outcome}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{row.requestId ?? "—"}</td>
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
