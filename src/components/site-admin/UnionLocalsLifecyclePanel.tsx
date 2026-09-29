"use client";

import { useTranslations } from "next-intl";
import type { UnionLifecycleRow } from "@/lib/site-admin/union-lifecycle-shared";
import { unionDeleteBlockedReason } from "@/lib/site-admin/union-delete-blocked";
import { UnionLifecycleActions } from "@/components/site-admin/UnionLifecycleActions";

type Props = {
  union: UnionLifecycleRow;
};

/**
 * Union header on the locals subpage: rename display name, archive, or delete
 * when empty — without leaving the locals workflow.
 */
export function UnionLocalsLifecyclePanel({ union }: Props) {
  const t = useTranslations("hub.platformOperator");

  return (
    <section className="mt-4 rounded-md border border-opseu-gray/15 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-opseu-dark">
            {t("unionLocalsManageTitle")}
          </h2>
          <p className="mt-1 text-sm text-opseu-gray-dark">
            {t("unionLocalsManageBody")}
          </p>
          <p className="mt-2 font-mono text-xs text-opseu-gray-dark">
            {union.slug}
            {union.archivedAt ? (
              <span className="ml-2 rounded bg-opseu-gray/15 px-2 py-0.5 text-opseu-gray-dark">
                {t("unionsStatusArchived")}
              </span>
            ) : null}
          </p>
        </div>
        <UnionLifecycleActions
          unionId={union.id}
          slug={union.slug}
          name={union.name}
          archived={Boolean(union.archivedAt)}
          empty={union.empty}
          deleteBlockedReason={unionDeleteBlockedReason(union, t)}
        />
      </div>
    </section>
  );
}
