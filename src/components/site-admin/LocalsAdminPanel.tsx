"use client";

import { useTranslations } from "next-intl";
import { LocalLifecycleActions } from "@/components/site-admin/LocalLifecycleActions";

export type LocalAdminRow = {
  id: string;
  localNumber: string;
  subText: string;
  divisionId: string | null;
  archivedAt: Date | null;
  isDemo: boolean;
  empty: boolean;
};

type CollectiveOption = { id: string; name: string };

type Props = {
  rows: LocalAdminRow[];
  collectives: CollectiveOption[];
  collectiveNameById: Map<string, string>;
};

/**
 * Locals inventory: card stack on small screens, table from md up,
 * so Edit / Archive / Delete stay tappable at large text sizes.
 */
export function LocalsAdminPanel({
  rows,
  collectives,
  collectiveNameById,
}: Props) {
  const t = useTranslations("hub.platformOperator");
  const activeRows = rows.filter((row) => !row.archivedAt);

  return (
    <section className="mt-6">
      <header className="mb-3">
        <h2 className="text-lg font-semibold text-opseu-dark">
          {t("localsPanelTitle")}
        </h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {t("localsPanelBody")}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-md border border-opseu-gray/15 bg-white px-3 py-4 text-center text-sm text-opseu-gray-dark">
          {t("localsNoneActive")}
        </p>
      ) : (
        <>
          {/* Mobile / large-text cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((row) => {
              const collectiveName = row.divisionId
                ? (collectiveNameById.get(row.divisionId) ?? null)
                : null;
              return (
                <li
                  key={row.id}
                  className="rounded-md border border-opseu-gray/15 bg-white p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-mono text-sm font-semibold text-opseu-dark">
                      {row.localNumber}
                    </p>
                    <p className="text-xs text-opseu-gray-dark">
                      {row.archivedAt
                        ? t("unionsStatusArchived")
                        : t("unionsStatusActive")}
                    </p>
                  </div>
                  <dl className="mt-2 space-y-1 text-sm text-opseu-gray-dark">
                    <div>
                      <dt className="inline font-medium text-opseu-dark">
                        {t("localsColSubline")}:{" "}
                      </dt>
                      <dd className="inline">{row.subText || "—"}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-opseu-dark">
                        {t("localsColCollective")}:{" "}
                      </dt>
                      <dd className="inline">{collectiveName ?? "—"}</dd>
                    </div>
                    {row.isDemo ? (
                      <div>
                        <span className="rounded bg-opseu-orange/20 px-2 py-0.5 text-xs text-opseu-orange-dark">
                          {t("usersDemoBadge")}
                        </span>
                      </div>
                    ) : null}
                  </dl>
                  <div className="mt-3 border-t border-opseu-gray/10 pt-3">
                    <LocalLifecycleActions
                      localId={row.id}
                      localNumber={row.localNumber}
                      subText={row.subText}
                      divisionId={row.divisionId}
                      archived={Boolean(row.archivedAt)}
                      empty={row.empty}
                      collectives={collectives}
                      orphanCollectiveName={collectiveName}
                      deleteBlockedReason={
                        row.archivedAt && !row.empty
                          ? t("localDeleteBlocked")
                          : null
                      }
                      stackActions
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          {activeRows.length === 0 ? (
            <p className="mt-2 text-sm text-opseu-gray-dark md:hidden">
              {t("localsOnlyArchived")}
            </p>
          ) : null}

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-md border border-opseu-gray/15 bg-white md:block">
            <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
              <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
                <tr>
                  <th className="px-3 py-2">{t("localsColNumber")}</th>
                  <th className="px-3 py-2">{t("localsColSubline")}</th>
                  <th className="px-3 py-2">{t("localsColCollective")}</th>
                  <th className="px-3 py-2">{t("localsColDemo")}</th>
                  <th className="px-3 py-2">{t("localsColArchived")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-opseu-gray/10">
                {rows.map((row) => {
                  const collectiveName = row.divisionId
                    ? (collectiveNameById.get(row.divisionId) ?? null)
                    : null;
                  return (
                    <tr key={row.id}>
                      <td className="px-3 py-2 font-mono text-xs text-opseu-dark">
                        {row.localNumber}
                      </td>
                      <td className="px-3 py-2 text-opseu-gray-dark">
                        {row.subText || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-opseu-gray-dark">
                        {collectiveName ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {row.isDemo ? (
                          <span className="rounded bg-opseu-orange/20 px-2 py-0.5 text-opseu-orange-dark">
                            {t("usersDemoBadge")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {row.archivedAt
                          ? row.archivedAt.toISOString().slice(0, 10)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <LocalLifecycleActions
                          localId={row.id}
                          localNumber={row.localNumber}
                          subText={row.subText}
                          divisionId={row.divisionId}
                          archived={Boolean(row.archivedAt)}
                          empty={row.empty}
                          collectives={collectives}
                          orphanCollectiveName={collectiveName}
                          deleteBlockedReason={
                            row.archivedAt && !row.empty
                              ? t("localDeleteBlocked")
                              : null
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {activeRows.length === 0 ? (
            <p className="mt-2 hidden text-sm text-opseu-gray-dark md:block">
              {t("localsOnlyArchived")}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
