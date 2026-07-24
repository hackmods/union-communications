"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useHybridCaseStore } from "@/hooks/use-hybrid-case-store";
import { daysUntilDue } from "@/lib/grievance/deadlines";
import type { Grievance } from "@/types/grievance";

interface OverdueItem extends Grievance {
  dueAt: string | null;
  isOverdue: boolean;
}

export function OverdueDashboard() {
  const t = useTranslations("qol");
  const tg = useTranslations("grievance");
  const th = useTranslations("hybrid");
  const { listGrievances, needsUnlock, revision } = useHybridCaseStore();
  const [items, setItems] = useState<OverdueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listGrievances()
      .then((result) => {
        if (cancelled) return;
        if (result.source === "locked") {
          setItems([]);
          setError(null);
          return;
        }
        setItems(result.grievances);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError(tg("loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listGrievances, revision, tg]);

  const overdue = useMemo(() => {
    return items
      .filter((g) => g.isOverdue)
      .sort((a, b) => {
        const da = a.dueAt ? new Date(a.dueAt).getTime() : 0;
        const db = b.dueAt ? new Date(b.dueAt).getTime() : 0;
        return da - db;
      });
  }, [items]);

  const upcoming = useMemo(() => {
    return items
      .filter((g) => !g.isOverdue && g.status !== "resolved" && g.dueAt)
      .sort((a, b) => {
        const da = a.dueAt ? new Date(a.dueAt).getTime() : 0;
        const db = b.dueAt ? new Date(b.dueAt).getTime() : 0;
        return da - db;
      })
      .slice(0, 10);
  }, [items]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={tg("loading")}>
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (needsUnlock) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-opseu-dark">
          {t("overdue.title")}
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-opseu-dark">{t("overdue.title")}</h1>
          <p className="mt-1 text-gray-600">{t("overdue.subtitle")}</p>
        </div>
        <Link href="/app/grievances">
          <Button variant="outline">{tg("backToList")}</Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("overdue.count")}</p>
          <p className="text-3xl font-bold text-red-600">{overdue.length}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("overdue.upcomingCount")}</p>
          <p className="text-3xl font-bold text-opseu-blue">{upcoming.length}</p>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-red-700">{t("overdue.sectionOverdue")}</h2>
        {overdue.length === 0 ? (
          <EmptyState className="mt-3" title={t("overdue.none")} />
        ) : (
          <div className="mt-3 space-y-2">
            {overdue.map((g) => {
              const days = g.dueAt
                ? Math.abs(daysUntilDue(new Date(g.dueAt)) ?? 0)
                : null;
              return (
                <Link key={g.id} href={`/app/grievances/${g.id}`}>
                  <Card className="border-red-200 bg-red-50/50 transition hover:border-red-300">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          {g.memberPseudonym ?? tg("anonymousMember")} - {g.category}
                        </CardTitle>
                        <p className="mt-1 text-sm text-gray-600">
                          {tg("step", { step: g.currentStep })} · {tg(`status.${g.status}`)}
                        </p>
                      </div>
                      <div className="text-right text-sm font-semibold text-red-700">
                        {days != null
                          ? t("overdue.daysOverdue", { days })
                          : tg("overdue")}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-opseu-dark">{t("overdue.sectionUpcoming")}</h2>
        {upcoming.length === 0 ? (
          <EmptyState className="mt-3" title={t("overdue.noneUpcoming")} />
        ) : (
          <div className="mt-3 space-y-2">
            {upcoming.map((g) => {
              const days = g.dueAt ? daysUntilDue(new Date(g.dueAt)) : null;
              return (
                <Link key={g.id} href={`/app/grievances/${g.id}`}>
                  <Card className="transition hover:border-opseu-blue/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {g.memberPseudonym ?? tg("anonymousMember")} - {g.category}
                      </CardTitle>
                      <span className="text-sm text-gray-600">
                        {days != null
                          ? t("overdue.daysUntil", { days })
                          : g.dueAt
                            ? tg("due", {
                                date: new Date(g.dueAt).toLocaleDateString(),
                              })
                            : ""}
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
