"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HubModule } from "@/types/tenant";
import { PUBLIC_SECTION_TITLE_CLASS } from "@/lib/constants/public-type";

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
    <section
      aria-labelledby="president-today-heading"
      className="space-y-3"
    >
      <h2 id="president-today-heading" className={PUBLIC_SECTION_TITLE_CLASS}>
        {t("title")}
      </h2>
      <p className="text-sm text-slate-600">{t("body")}</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {visible.map((card) => (
          <li key={card.id}>
            <Link
              href={card.href}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-opseu-blue/40 hover:bg-opseu-blue/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="text-sm font-semibold text-opseu-dark">
                {card.label}
              </span>
              <span className="text-right text-sm leading-snug text-slate-600">
                {card.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
