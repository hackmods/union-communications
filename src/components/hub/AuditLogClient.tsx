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
}

export function AuditLogClient() {
  const t = useTranslations("hub");
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/audit?limit=100");
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
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
        {t("auditTitle")}
      </h1>
      <p className="mt-1 text-sm text-gray-600 sm:text-base">
        {t("auditSubtitle")}
      </p>
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
      {entries.length > 0 && (
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
                      {row.action}
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
