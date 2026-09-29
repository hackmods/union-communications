"use client";

import { useTranslations } from "next-intl";
import type { CollectiveLifecycleRow } from "@/lib/site-admin/collective-lifecycle";
import { CollectiveLifecycleActions } from "@/components/site-admin/CollectiveLifecycleActions";

type Props = {
  rows: CollectiveLifecycleRow[];
};

/**
 * Bargaining collectives: card stack on small screens, table from md up.
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

      {rows.length === 0 ? (
        <p className="rounded-md border border-opseu-gray/15 bg-white px-3 py-4 text-center text-sm text-opseu-gray-dark">
          {t("collectivesNone")}
        </p>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-md border border-opseu-gray/15 bg-white p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-sm font-semibold text-opseu-dark">
                    {row.code}
                  </p>
                  <p className="text-xs text-opseu-gray-dark">
                    {row.archivedAt
                      ? t("unionsStatusArchived")
                      : t("unionsStatusActive")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-opseu-gray-dark">{row.name}</p>
                <p className="mt-1 text-xs text-opseu-gray-dark">
                  {t("collectivesColLocals")}: {row.activeLocalCount}/
                  {row.localCount}
                </p>
                <div className="mt-3 border-t border-opseu-gray/10 pt-3">
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
                    stackActions
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-md border border-opseu-gray/15 bg-white md:block">
            <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
              <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
                <tr>
                  <th className="px-3 py-2">{t("collectivesColCode")}</th>
                  <th className="px-3 py-2">{t("collectivesColName")}</th>
                  <th className="px-3 py-2 text-right">
                    {t("collectivesColLocals")}
                  </th>
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
                    <td className="px-3 py-2 text-opseu-gray-dark">
                      {row.name}
                    </td>
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
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
