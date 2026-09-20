"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Panel-shaped loading placeholder — matches PortalPanel chrome so route
 * and client fetches do not flash a bare "Loading…" line.
 */
export function PortalPageLoading({
  columns = 2,
}: {
  columns?: 2 | 3;
}) {
  const t = useTranslations("portal");

  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">{t("loading")}</span>
      <div className="overflow-hidden rounded-xl border border-opseu-blue/20 bg-gradient-to-br from-opseu-blue/[0.07] via-white to-opseu-orange/[0.05] shadow-sm">
        <div className="space-y-3 border-b border-opseu-blue/10 px-4 py-4 sm:px-5 sm:py-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-48 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div
            className={
              columns === 3
                ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                : "grid gap-3 sm:grid-cols-2"
            }
          >
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            {columns === 3 ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
