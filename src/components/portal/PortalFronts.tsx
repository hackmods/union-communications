"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Circle } from "@/types/portal";
import { PortalRetryCallout } from "@/components/portal/PortalRetryCallout";
import { PortalPanel } from "@/components/portal/PortalPanel";
import { PortalPageLoading } from "@/components/portal/PortalPageLoading";

export function PortalFronts() {
  const t = useTranslations("portal");
  const [fronts, setFronts] = useState<Circle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/fronts");
      if (!res.ok) {
        setError(t("loadError"));
        return;
      }
      const data = (await res.json()) as { fronts: Circle[] };
      setFronts(data.fronts);
      setError(null);
    } catch {
      setError(t("loadError"));
    }
  }, [t]);

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
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (error) {
    return <PortalRetryCallout message={error} onRetry={() => void load()} />;
  }
  if (!fronts) return <PortalPageLoading />;

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
    <PortalPanel
      eyebrow={t("portalEyebrow")}
      title={t("frontsTitle")}
      titleId="portal-fronts-heading"
      titleLevel="page"
      lead={t("frontsSubtitle")}
      breadcrumb={
        <Link
          href="/portal"
          className="font-medium text-opseu-blue underline-offset-2 hover:underline"
        >
          {t("stationTitle")}
        </Link>
      }
    >
      {fronts.length === 0 ? (
        <p className="text-sm text-gray-500">{t("frontsEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {fronts.map((c) => {
            const start = new Date(c.frontStartsAt ?? c.createdAt).getTime();
            const end = new Date(
              c.frontEndsAt ?? c.frontStartsAt ?? c.createdAt,
            ).getTime();
            const left = ((start - new Date(min).getTime()) / span) * 100;
            const width = Math.max(8, ((end - start) / span) * 100);
            return (
              <li key={c.id}>
                <div className="group rounded-lg border border-slate-200 bg-white p-3.5 transition-colors duration-150 hover:border-opseu-blue/50 hover:bg-slate-50 motion-reduce:transition-none">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/portal/circles/${c.id}`}
                      className="inline-flex min-h-11 items-center gap-2 font-semibold text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 focus-visible:ring-offset-2"
                    >
                      {c.name}
                      <span
                        className="text-sm font-medium text-opseu-blue"
                        aria-hidden
                      >
                        →
                      </span>
                    </Link>
                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t(`kind.${c.kind}`)}
                    </span>
                  </div>
                  <div className="mt-3 h-8 overflow-hidden rounded-lg bg-gray-100">
                    <div
                      className="flex h-8 items-center rounded-lg bg-opseu-blue/80 px-2 text-xs font-medium text-white"
                      style={{
                        marginLeft: `${left}%`,
                        width: `${width}%`,
                      }}
                    >
                      {new Date(
                        c.frontStartsAt ?? c.createdAt,
                      ).toLocaleDateString()}
                      {" – "}
                      {c.frontEndsAt
                        ? new Date(c.frontEndsAt).toLocaleDateString()
                        : "…"}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PortalPanel>
  );
}
