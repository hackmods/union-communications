"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { UnionLifecycleRow } from "@/lib/site-admin/union-lifecycle-shared";
import { unionDeleteBlockedReason } from "@/lib/site-admin/union-delete-blocked";
import { UnionLifecycleActions } from "@/components/site-admin/UnionLifecycleActions";

type Props = {
  rows: UnionLifecycleRow[];
};

/**
 * Locals index: open a union’s locals, rename its display name, archive, or
 * permanently delete when empty (same lifecycle APIs as Unions admin).
 */
export function LocalsUnionsTable({ rows }: Props) {
  const t = useTranslations("hub.platformOperator");

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-opseu-gray/15 bg-white px-3 py-8 text-sm text-opseu-gray-dark">
        <p className="font-semibold text-opseu-dark">{t("localsEmptyTitle")}</p>
        <p className="mt-1">{t("localsEmptyBody")}</p>
        <p className="mt-3">
          <Link
            href="/app/onboarding"
            className="font-semibold text-opseu-blue underline underline-offset-2"
          >
            {t("localsEmptyCta")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
      <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
        <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
          <tr>
            <th className="px-3 py-2">{t("localsColUnion")}</th>
            <th className="px-3 py-2 text-right">{t("localsColCount")}</th>
            <th className="px-3 py-2 text-right">{t("localsColActive")}</th>
            <th className="px-3 py-2">{t("unionsColStatus")}</th>
            <th className="px-3 py-2">{t("localsColDemo")}</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-opseu-gray/10">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-3 py-2">
                <div className="font-semibold text-opseu-dark">{row.name}</div>
                <div className="font-mono text-xs text-opseu-gray-dark">
                  {row.slug}
                </div>
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {row.localCount}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs">
                {row.activeLocalCount}
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
              <td className="px-3 py-2 text-xs">
                {row.isDemo ? (
                  <span className="rounded bg-opseu-orange/20 px-2 py-0.5 text-opseu-orange-dark">
                    {t("usersDemoBadge")}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/app/site-admin/organization/${encodeURIComponent(row.id)}`}
                    className="text-sm font-medium text-opseu-blue hover:underline"
                  >
                    {t("usersOpen")}
                  </Link>
                  <UnionLifecycleActions
                    unionId={row.id}
                    slug={row.slug}
                    name={row.name}
                    archived={Boolean(row.archivedAt)}
                    empty={row.empty}
                    deleteBlockedReason={unionDeleteBlockedReason(row, t)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
