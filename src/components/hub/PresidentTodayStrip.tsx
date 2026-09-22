"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HubModule } from "@/types/tenant";
import { PUBLIC_SECTION_TITLE_CLASS } from "@/lib/constants/public-type";

/**
 * Compact “Today” strip for presidents — deep links into high-value Hub work
 * without turning the dashboard into a second nav.
 */
export function PresidentTodayStrip({
  enabledModules,
  show,
}: {
  enabledModules: HubModule[];
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
      show: true,
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
      show: true,
    },
  ];

  const visible = cards.filter((c) => c.show);
  if (visible.length === 0) return null;

  return (
    <section
      aria-labelledby="president-today-heading"
      className="space-y-3 md:col-span-2"
    >
      <h2 id="president-today-heading" className={PUBLIC_SECTION_TITLE_CLASS}>
        {t("title")}
      </h2>
      <p className="text-sm text-slate-600">{t("body")}</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((card) => (
          <li key={card.id}>
            <Link
              href={card.href}
              className="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 hover:border-opseu-blue/40 hover:bg-opseu-blue/[0.03]"
            >
              <span className="text-sm font-semibold text-opseu-dark">
                {card.label}
              </span>
              <span className="mt-3 text-sm leading-relaxed text-slate-600">
                {card.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
