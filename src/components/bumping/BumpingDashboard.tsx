"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useHybridCaseStore } from "@/hooks/use-hybrid-case-store";
import type { BumpingCase } from "@/types/bumping";

export function BumpingDashboard({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("bumping");
  const th = useTranslations("hybrid");
  const { listBumpingCases, needsUnlock, isLiveLocal, revision } =
    useHybridCaseStore();
  const [items, setItems] = useState<BumpingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listBumpingCases()
      .then((result) => {
        if (cancelled) return;
        if (result.source === "locked") {
          setItems([]);
          setError(null);
          return;
        }
        setItems(result.cases);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listBumpingCases, revision, t]);

  const inReview = items.filter((c) => c.status === "in_review");
  const open = items.filter((c) => c.status === "open" || c.status === "in_review");

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-8 w-48 max-w-full sm:w-56" />
        <Skeleton className="h-4 w-full max-w-sm" />
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <Skeleton className="h-20 w-full sm:h-24" />
          <Skeleton className="h-20 w-full sm:h-24" />
        </div>
        <Skeleton className="h-28 w-full sm:h-32" />
      </div>
    );
  }

  if (needsUnlock) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
          {t("title")}
        </h1>
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {th("needsUnlockBanner")}{" "}
          <Link href="/app/hybrid" className="font-medium underline">
            {th("openHybridSettings")}
          </Link>
        </p>
      </div>
    );
  }

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-opseu-dark sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            {t("subtitle")}
          </p>
          <p className="mt-2 text-xs text-gray-500">{t("disclaimer")}</p>
          {isLiveLocal && (
            <p
              className="mt-2 rounded-lg border border-opseu-blue/20 bg-opseu-blue/5 px-3 py-2 text-sm text-opseu-dark"
              role="status"
            >
              {th("liveLocalBanner")}
            </p>
          )}
          <p className="mt-2">
            <Link
              href="/guide/seniority-bumping"
              className="text-sm font-medium text-opseu-blue underline underline-offset-2"
            >
              {t("seniorityGuideLink")}
            </Link>
          </p>
        </div>
        {canWrite && (
          <Link href="/app/bumping/new" className="w-full shrink-0 sm:w-auto">
            <Button className="w-full sm:w-auto">{t("newCase")}</Button>
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-4">
        <Card className="px-2 py-3 sm:px-4 sm:py-4">
          <p className="text-xs font-medium text-gray-500 sm:text-sm">
            {t("stats.active")}
          </p>
          <p className="mt-1 text-xl font-bold text-opseu-dark sm:text-2xl">
            {open.length}
          </p>
        </Card>
        <Card className="px-2 py-3 sm:px-4 sm:py-4">
          <p className="text-xs font-medium text-gray-500 sm:text-sm">
            {t("stats.inReview")}
          </p>
          <p className="mt-1 text-xl font-bold text-opseu-blue sm:text-2xl">
            {inReview.length}
          </p>
        </Card>
      </div>

      <section className="mt-6 sm:mt-8">
        <h2 className="text-lg font-bold text-opseu-dark sm:text-xl">
          {t("allCases")}
        </h2>
        {items.length === 0 ? (
          <EmptyState
            className="mt-3"
            title={t("empty")}
            action={
              canWrite ? (
                <Link href="/app/bumping/new">
                  <Button size="sm">{t("newCase")}</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="mt-3 space-y-2">
            {items.map((c) => (
              <Link key={c.id} href={`/app/bumping/${c.id}`} className="block">
                <Card className="transition hover:border-opseu-blue/40">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base break-words">
                        {c.memberRef} - {c.currentPosition}
                      </CardTitle>
                      <p className="mt-1 text-sm text-gray-600 break-words">
                        {c.scenario}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {t("seniority")}: {c.seniorityDate}
                      </p>
                    </div>
                    <Badge variant="info" className="w-fit shrink-0">
                      {t(`status.${c.status}`)}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
