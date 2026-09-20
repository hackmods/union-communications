"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import type { DispatchItem } from "@/types/portal";
import { circleHrefForDispatch } from "@/components/portal/portal-nav-model";
import { PortalRetryCallout } from "@/components/portal/PortalRetryCallout";
import { PortalPanel } from "@/components/portal/PortalPanel";
import { cn } from "@/lib/utils";

export function PortalDispatch() {
  const t = useTranslations("portal");
  const [items, setItems] = useState<DispatchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/dispatch");
      if (!res.ok) {
        setError(t("loadError"));
        return;
      }
      const data = (await res.json()) as { items: DispatchItem[] };
      setItems(data.items);
      setError(null);
    } catch {
      setError(t("loadError"));
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/portal/dispatch")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(t("loadError"));
          return;
        }
        const data = (await res.json()) as { items: DispatchItem[] };
        setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setError(t("loadError"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function markAll() {
    await fetch("/api/portal/dispatch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }

  if (error) {
    return <PortalRetryCallout message={error} onRetry={() => void load()} />;
  }
  if (!items) return <p className="text-gray-600">{t("loading")}</p>;

  return (
    <PortalPanel
      eyebrow={t("portalEyebrow")}
      title={t("dispatchTitle")}
      titleId="portal-dispatch-heading"
      titleLevel="page"
      lead={t("dispatchSubtitle")}
      breadcrumb={
        <Link
          href="/portal"
          className="font-medium text-opseu-blue underline-offset-2 hover:underline"
        >
          {t("stationTitle")}
        </Link>
      }
      actions={
        <Button type="button" variant="outline" onClick={() => void markAll()}>
          {t("markAllRead")}
        </Button>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{t("dispatchEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const unread = !item.readAt;
            return (
              <li key={item.id}>
                <Link
                  href={circleHrefForDispatch(item.circleId, item.kind)}
                  className={cn(
                    "group flex min-h-11 flex-col rounded-xl border bg-white px-3.5 py-3 transition-all duration-200 ease-out",
                    "hover:-translate-y-0.5 hover:border-opseu-blue/40 hover:shadow-md",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 focus-visible:ring-offset-2",
                    "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                    unread
                      ? "border-l-4 border-l-opseu-blue border-slate-200/90"
                      : "border-slate-200/90 text-gray-500",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "font-semibold text-opseu-dark",
                        !unread && "font-medium text-gray-600",
                      )}
                    >
                      {item.title}
                    </span>
                    <span
                      className="mt-0.5 shrink-0 text-sm font-medium text-opseu-blue transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                      aria-hidden
                    >
                      →
                    </span>
                  </span>
                  <span className="mt-1 text-sm text-gray-600">
                    {item.circleName} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PortalPanel>
  );
}
