"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import type { Circle } from "@/types/portal";

export function PortalFronts() {
  const t = useTranslations("portal");
  const [fronts, setFronts] = useState<Circle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/portal/fronts")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(t("loadError"));
          return;
        }
        const data = (await res.json()) as { fronts: Circle[] };
        setFronts(data.fronts);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (error) return <Callout>{error}</Callout>;
  if (!fronts) return <p className="text-gray-600">{t("loading")}</p>;

  const min = fronts.reduce(
    (earliest, c) => {
      const s = c.frontStartsAt ?? c.createdAt;
      return s < earliest ? s : earliest;
    },
    fronts[0]?.frontStartsAt ?? fronts[0]?.createdAt ?? new Date().toISOString(),
  );
  const max = fronts.reduce(
    (latest, c) => {
      const e = c.frontEndsAt ?? c.frontStartsAt ?? c.createdAt;
      return e > latest ? e : latest;
    },
    fronts[0]?.frontEndsAt ?? new Date().toISOString(),
  );
  const span = Math.max(1, new Date(max).getTime() - new Date(min).getTime());

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm">
          <Link href="/portal" className="text-opseu-blue hover:underline">
            {t("stationTitle")}
          </Link>
        </p>
        <h1 className="text-3xl font-bold text-opseu-dark">{t("frontsTitle")}</h1>
        <p className="mt-1 max-w-prose text-gray-600">{t("frontsSubtitle")}</p>
      </div>
      {fronts.length === 0 ? (
        <p className="text-sm text-gray-500">{t("frontsEmpty")}</p>
      ) : (
        <ul className="space-y-4">
          {fronts.map((c) => {
            const start = new Date(c.frontStartsAt ?? c.createdAt).getTime();
            const end = new Date(
              c.frontEndsAt ?? c.frontStartsAt ?? c.createdAt,
            ).getTime();
            const left = ((start - new Date(min).getTime()) / span) * 100;
            const width = Math.max(8, ((end - start) / span) * 100);
            return (
              <li key={c.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/portal/circles/${c.id}`}
                    className="font-semibold text-opseu-dark hover:underline"
                  >
                    {c.name}
                  </Link>
                  <span className="text-xs text-gray-500">
                    {t(`kind.${c.kind}`)}
                  </span>
                </div>
                <div className="mt-2 h-8 rounded bg-gray-100">
                  <div
                    className="flex h-8 items-center rounded bg-opseu-blue/80 px-2 text-xs font-medium text-white"
                    style={{
                      marginLeft: `${left}%`,
                      width: `${width}%`,
                    }}
                  >
                    {new Date(c.frontStartsAt ?? c.createdAt).toLocaleDateString()}
                    {" – "}
                    {c.frontEndsAt
                      ? new Date(c.frontEndsAt).toLocaleDateString()
                      : "…"}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href="/portal"
        className="inline-flex min-h-11 items-center rounded-lg border-2 border-opseu-blue px-4 py-2 text-sm font-semibold text-opseu-blue"
      >
        {t("backToStation")}
      </Link>
    </div>
  );
}
