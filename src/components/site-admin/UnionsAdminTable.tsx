"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  duplicateNameKeys,
  sortUnionsForSiteAdmin,
  unionNameKey,
  type UnionLifecycleRow,
} from "@/lib/site-admin/union-lifecycle-shared";
import { unionDeleteBlockedReason } from "@/lib/site-admin/union-delete-blocked";
import { UnionLifecycleActions } from "@/components/site-admin/UnionLifecycleActions";

type StatusFilter = "all" | "active" | "archived";

type Props = {
  rows: UnionLifecycleRow[];
  demoPurgeOn: boolean;
};

function formatCreated(iso: string | null, locale: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Site Admin unions inventory: filter, duplicate flags, linked counts, lifecycle actions.
 */
export function UnionsAdminTable({ rows, demoPurgeOn }: Props) {
  const t = useTranslations("hub.platformOperator");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const locale =
    typeof navigator !== "undefined" ? navigator.language : "en-CA";

  const dupeKeys = useMemo(() => duplicateNameKeys(rows), [rows]);

  const visible = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (filter === "active") return !row.archivedAt;
      if (filter === "archived") return Boolean(row.archivedAt);
      return true;
    });
    return sortUnionsForSiteAdmin(filtered);
  }, [rows, filter]);

  const archivedCount = rows.filter((r) => r.archivedAt).length;
  const activeCount = rows.length - archivedCount;
  const duplicateCount = rows.filter((r) =>
    dupeKeys.has(unionNameKey(r.name)),
  ).length;

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-opseu-gray/15 bg-white px-3 py-8 text-sm text-opseu-gray-dark">
        <p className="font-semibold text-opseu-dark">{t("unionsEmptyTitle")}</p>
        <p className="mt-1">{t("unionsEmptyBody")}</p>
        <p className="mt-3">
          <Link
            href="/app/onboarding"
            className="font-semibold text-opseu-blue underline underline-offset-2"
          >
            {t("unionsEmptyCta")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div
          className="inline-flex rounded-md border border-opseu-gray/20 bg-white p-0.5"
          role="group"
          aria-label={t("unionsFilterLabel")}
        >
          {(
            [
              ["all", t("unionsFilterAll", { count: rows.length })],
              ["active", t("unionsFilterActive", { count: activeCount })],
              ["archived", t("unionsFilterArchived", { count: archivedCount })],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                filter === value
                  ? "rounded px-3 py-1.5 text-sm font-semibold bg-opseu-dark text-white"
                  : "rounded px-3 py-1.5 text-sm font-medium text-opseu-gray-dark hover:bg-opseu-gray/10"
              }
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {duplicateCount > 0 ? (
          <p className="text-sm text-opseu-orange-dark">
            {t("unionsDuplicateBanner", { count: duplicateCount })}
          </p>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-md border border-opseu-gray/15 bg-opseu-gray/5 px-3 py-4 text-sm text-opseu-gray-dark">
          {t("unionsFilterEmpty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
          <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
            <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
              <tr>
                <th className="px-3 py-2">{t("unionsColName")}</th>
                <th className="px-3 py-2">{t("unionsColSlug")}</th>
                <th className="px-3 py-2 text-right">{t("unionsColLocals")}</th>
                <th className="px-3 py-2 text-right">{t("unionsColUsers")}</th>
                <th className="px-3 py-2">{t("unionsColCreated")}</th>
                <th className="px-3 py-2">{t("unionsColStatus")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-opseu-gray/10">
              {visible.map((row) => {
                const isDupe = dupeKeys.has(unionNameKey(row.name));
                return (
                  <tr
                    key={row.id}
                    className={isDupe ? "bg-opseu-orange/5" : undefined}
                  >
                    <td className="px-3 py-2">
                      <div className="font-semibold text-opseu-dark">
                        {row.name}
                      </div>
                      <div className="font-mono text-xs text-opseu-gray-dark">
                        {row.id}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {isDupe ? (
                          <span className="rounded bg-opseu-orange/25 px-2 py-0.5 text-xs font-medium text-opseu-orange-dark">
                            {t("unionsDuplicateBadge")}
                          </span>
                        ) : null}
                        {row.isDemo ? (
                          demoPurgeOn ? (
                            <Link
                              href="/app/site-admin/demo-cleanup"
                              className="rounded bg-opseu-orange/20 px-2 py-0.5 text-xs text-opseu-orange-dark underline-offset-2 hover:underline"
                            >
                              {t("usersDemoBadge")}
                            </Link>
                          ) : (
                            <span className="rounded bg-opseu-orange/20 px-2 py-0.5 text-xs text-opseu-orange-dark">
                              {t("usersDemoBadge")}
                            </span>
                          )
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.slug}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      <Link
                        href={`/app/site-admin/locals/${encodeURIComponent(row.id)}`}
                        className="text-opseu-blue hover:underline"
                        title={t("unionsOpenLocals")}
                      >
                        {row.activeLocalCount}/{row.localCount}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {row.userCount}
                    </td>
                    <td className="px-3 py-2 text-xs text-opseu-gray-dark">
                      {formatCreated(row.createdAt, locale)}
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
                      <UnionLifecycleActions
                        unionId={row.id}
                        slug={row.slug}
                        name={row.name}
                        archived={Boolean(row.archivedAt)}
                        empty={row.empty}
                        deleteBlockedReason={unionDeleteBlockedReason(row, t)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
