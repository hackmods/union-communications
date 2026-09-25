"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import type { CheckinPendingItem } from "@/types/checkins";

type LoadState = "loading" | "ready" | "error";

/** Unanswered questions for the signed-in officer, scoped by the API. */
export function MyCheckinsWidget() {
  const t = useTranslations("checkins");
  const [pending, setPending] = useState<CheckinPendingItem[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/checkins/mine?unanswered=1", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Check-ins: ${res.status}`);
        const data = (await res.json()) as { pending?: CheckinPendingItem[] };
        setPending((data.pending ?? []).slice(0, 5));
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => controller.abort();
  }, []);

  return (
    <Card density="compact" className="h-full min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <CardTitle>{t("widgetTitle")}</CardTitle>
        <Link href="/app/checkins" className="text-sm font-medium text-opseu-blue underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2">
          {t("widgetAll")}
        </Link>
      </div>
      <div role="status" aria-live="polite" className="mt-3 text-sm leading-relaxed text-gray-700">
        {state === "loading" ? <p>{t("loading")}</p> : null}
        {state === "error" ? <p>{t("widgetError")}</p> : null}
        {state === "ready" && pending.length === 0 ? <p>{t("widgetEmpty")}</p> : null}
        {state === "ready" && pending.length > 0 ? (
          <ul className="space-y-2">
            {pending.map((item) => (
              <li key={item.schedule.id} className="border-t border-slate-200 pt-2 first:border-0 first:pt-0">
                <Link href={`/app/checkins/${item.schedule.id}`} className="font-medium text-opseu-blue underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
                  {item.schedule.question}
                </Link>
                <p className="text-xs text-gray-600">{t("periodLabel", { period: item.periodLabel })}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}
