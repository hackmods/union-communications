"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { BumpingCase } from "@/types/bumping";

export function BumpingDashboard({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("bumping");
  const [items, setItems] = useState<BumpingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/bumping/cases")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setItems(data.cases);
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const inReview = items.filter((c) => c.status === "in_review");
  const open = items.filter((c) => c.status === "open" || c.status === "in_review");

  if (loading) return <p className="text-gray-600">{t("loading")}</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
          <p className="mt-1 text-gray-600">{t("subtitle")}</p>
          <p className="mt-2 text-xs text-gray-500">{t("disclaimer")}</p>
        </div>
        {canWrite && (
          <Link href="/app/bumping/new">
            <Button>{t("newCase")}</Button>
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("stats.active")}</p>
          <p className="text-2xl font-bold text-opseu-dark">{open.length}</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">{t("stats.inReview")}</p>
          <p className="text-2xl font-bold text-opseu-blue">{inReview.length}</p>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-opseu-dark">{t("allCases")}</h2>
        {items.length === 0 ? (
          <Card className="mt-3">
            <p className="text-gray-600">{t("empty")}</p>
          </Card>
        ) : (
          <div className="mt-3 space-y-2">
            {items.map((c) => (
              <Link key={c.id} href={`/app/bumping/${c.id}`}>
                <Card className="transition hover:border-opseu-blue/40">
                  <CardTitle className="text-base">
                    {c.memberRef} — {c.currentPosition}
                  </CardTitle>
                  <p className="mt-1 text-sm text-gray-600">{c.scenario}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {t(`status.${c.status}`)} · {t("seniority")}: {c.seniorityDate}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
