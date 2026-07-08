"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Grievance } from "@/types/grievance";

interface GrievanceListItem extends Grievance {
  dueAt: string | null;
  isOverdue: boolean;
}

export function GrievanceDashboard() {
  const t = useTranslations("grievance");
  const [items, setItems] = useState<GrievanceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/grievances")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setItems(data.grievances);
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const overdue = items.filter((g) => g.isOverdue);
  const upcoming = items.filter(
    (g) => !g.isOverdue && g.status !== "resolved" && g.dueAt,
  );
  const open = items.filter((g) => g.status !== "resolved");

  if (loading) {
    return <p className="text-gray-600">{t("loading")}</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
          <p className="mt-1 text-gray-600">{t("subtitle")}</p>
        </div>
        <Link href="/app/grievances/new">
          <Button>{t("newGrievance")}</Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("stats.open")}</p>
          <p className="text-2xl font-bold text-opseu-dark">{open.length}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("stats.overdue")}</p>
          <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("stats.upcoming")}</p>
          <p className="text-2xl font-bold text-opseu-blue">{upcoming.length}</p>
        </Card>
      </div>

      {overdue.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-red-700">{t("overdueTitle")}</h2>
          <div className="mt-3 space-y-2">
            {overdue.map((g) => (
              <GrievanceRow key={g.id} grievance={g} t={t} urgent />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold text-opseu-dark">{t("allGrievances")}</h2>
        {items.length === 0 ? (
          <Card className="mt-3">
            <p className="text-gray-600">{t("empty")}</p>
          </Card>
        ) : (
          <div className="mt-3 space-y-2">
            {items.map((g) => (
              <GrievanceRow key={g.id} grievance={g} t={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GrievanceRow({
  grievance,
  t,
  urgent,
}: {
  grievance: GrievanceListItem;
  t: ReturnType<typeof useTranslations<"grievance">>;
  urgent?: boolean;
}) {
  return (
    <Link href={`/app/grievances/${grievance.id}`}>
      <Card
        className={`transition hover:border-opseu-blue/40 ${urgent ? "border-red-200 bg-red-50/50" : ""}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {grievance.memberPseudonym ?? t("anonymousMember")} — {grievance.category}
            </CardTitle>
            <p className="mt-1 text-sm text-gray-600">
              {t("step", { step: grievance.currentStep })} · {t(`status.${grievance.status}`)}
            </p>
          </div>
          <div className="text-right text-sm">
            {grievance.isOverdue && (
              <span className="font-semibold text-red-600">{t("overdue")}</span>
            )}
            {grievance.dueAt && !grievance.isOverdue && (
              <span className="text-gray-500">
                {t("due", {
                  date: new Date(grievance.dueAt).toLocaleDateString(),
                })}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
