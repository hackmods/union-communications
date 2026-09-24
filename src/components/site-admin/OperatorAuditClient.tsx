"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
  metadata?: Record<string, string>;
}

export function OperatorAuditClient() {
  const t = useTranslations("hub.platformOperator");
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/site-admin/audit?limit=100");
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? res.statusText);
        }
        const data = (await res.json()) as { entries: AuditRow[] };
        if (!cancelled) setEntries(data.entries);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("operatorAuditLoadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <>
      <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
        {t("operatorAuditTitle")}
      </h1>
      <p className="mt-1 text-sm text-gray-600 sm:text-base">
        {t("operatorAuditSubtitle")}
      </p>
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
        <p className="mt-6 text-sm text-red-700" role="alert">
          {error}
        </p>
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
