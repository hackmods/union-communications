"use client";

import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { HubHomeTile } from "@/components/hub/HubHomeTile";
import type { HubModule } from "@/types/tenant";

/**
 * A short list of president work routes. These links do not claim live status.
 * Ledger/meetings use the same visibility as the officer tools catalog so we
 * never offer silent redirects to /app.
 */
export function PresidentTodayStrip({
  enabledModules,
  showLedger,
  showMeetings,
  show,
}: {
  enabledModules: HubModule[];
  showLedger: boolean;
  showMeetings: boolean;
  show: boolean;
}) {
  const t = useTranslations("hub.presidentToday");

  if (!show) return null;

  const cards: {
    id: string;
    href: string;
    label: string;
    blurb: string;
    show: boolean;
  }[] = [
    {
      id: "overdue",
      href: "/app/overdue",
      label: t("overdue"),
      blurb: t("overdueBlurb"),
      show: enabledModules.includes("grievance"),
    },
    {
      id: "ledger",
      href: "/app/ledger",
      label: t("ledger"),
      blurb: t("ledgerBlurb"),
      show: showLedger,
    },
    {
      id: "portal",
      href: "/portal",
      label: t("portal"),
      blurb: t("portalBlurb"),
      show: enabledModules.includes("portal"),
    },
    {
      id: "meetings",
      href: "/app/meetings",
      label: t("meetings"),
      blurb: t("meetingsBlurb"),
      show: showMeetings,
    },
  ];

  const visible = cards.filter((c) => c.show);
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="president-today-heading" className="space-y-3">
      <div>
        <h3 id="president-today-heading" className="text-base font-bold text-opseu-dark">
          {t("title")}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{t("body")}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {visible.map((card) => (
          <li key={card.id} className="min-w-0">
            <HubHomeTile href={card.href} title={card.label} body={card.blurb} />
          </li>
        ))}
      </ul>
    </section>
  );
}
