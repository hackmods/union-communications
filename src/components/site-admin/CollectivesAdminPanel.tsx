"use client";

import { useTranslations } from "next-intl";
import type { CollectiveLifecycleRow } from "@/lib/site-admin/collective-lifecycle";
import { CollectiveLifecycleActions } from "@/components/site-admin/CollectiveLifecycleActions";

type Props = {
  rows: CollectiveLifecycleRow[];
};

/**
 * Bargaining collectives table with edit / archive / empty-delete actions.
 */
export function CollectivesAdminPanel({ rows }: Props) {
  const t = useTranslations("hub.platformOperator");

  return (
    <section className="mt-6">
      <header className="mb-3">
        <h2 className="text-lg font-semibold text-opseu-dark">
          {t("collectivesPanelTitle")}
        </h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {t("collectivesPanelBody")}
        </p>
      </header>
      <div className="overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
        <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
          <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
            <tr>
              <th className="px-3 py-2">{t("collectivesColCode")}</th>
              <th className="px-3 py-2">{t("collectivesColName")}</th>
              <th className="px-3 py-2 text-right">{t("collectivesColLocals")}</th>
              <th className="px-3 py-2">{t("unionsColStatus")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-opseu-gray/10">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 font-mono text-xs text-opseu-dark">
                  {row.code}
                </td>
                <td className="px-3 py-2 text-opseu-gray-dark">{row.name}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {row.activeLocalCount}/{row.localCount}
                </td>
                <td className="px-3 py-2 text-xs">
                  {row.archivedAt ? (
                    <span className="rounded bg-opseu-gray/15 px-2 py-0.5 text-opseu-gray-dark">
                      {t("unionsStatusArchived")}
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800">
                      {t("unionsStatusActive")}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <CollectiveLifecycleActions
                    collectiveId={row.id}
                    code={row.code}
                    name={row.name}
                    archived={Boolean(row.archivedAt)}
                    empty={row.empty}
                    deleteBlockedReason={
                      row.archivedAt && !row.empty
                        ? t("collectiveDeleteBlocked")
                        : null
                    }
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-center text-sm text-opseu-gray-dark"
                >
                  {t("collectivesNone")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
