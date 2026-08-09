"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { DispatchItem } from "@/types/portal";

export function PortalDispatch() {
  const t = useTranslations("portal");
  const [items, setItems] = useState<DispatchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/portal/dispatch");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as { items: DispatchItem[] };
    setItems(data.items);
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

  if (error) return <Callout>{error}</Callout>;
  if (!items) return <p className="text-gray-600">{t("loading")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm">
            <Link href="/portal" className="text-opseu-blue hover:underline">
              {t("stationTitle")}
            </Link>
          </p>
          <h1 className="text-3xl font-bold text-opseu-dark">
            {t("dispatchTitle")}
          </h1>
          <p className="mt-1 text-gray-600">{t("dispatchSubtitle")}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void markAll()}>
          {t("markAllRead")}
        </Button>
      </div>
      <ul className="space-y-3">
        {items.length === 0 ? (
          <li className="text-sm text-gray-500">{t("dispatchEmpty")}</li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className={`border-l-4 pl-4 ${
                item.readAt
                  ? "border-gray-200 text-gray-500"
                  : "border-opseu-blue"
              }`}
            >
              <Link
                href={`/portal/circles/${item.circleId}`}
                className="font-semibold text-opseu-dark hover:underline"
              >
                {item.title}
              </Link>
              <p className="text-sm text-gray-600">
                {item.circleName} · {new Date(item.createdAt).toLocaleString()}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
