"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Callout } from "@/components/ui/Callout";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import {
  UPDATE_KINDS,
  type UpdateKind,
  filterUpdates,
  formatUpdateDate,
  formatUpdateMonth,
  groupUpdatesByMonth,
  visibleUpdates,
} from "@/lib/constants/updates";
import { cn } from "@/lib/utils";

type FilterKind = UpdateKind | "all";

const FILTERS: FilterKind[] = ["all", ...UPDATE_KINDS];

export function UpdatesContent() {
  const t = useTranslations("updates");
  const locale = useLocale();
  const [filter, setFilter] = useState<FilterKind>("all");
  const hubPublic = isOfficerHubPublic();

  const groups = useMemo(() => {
    const visible = visibleUpdates({ officerHubPublic: hubPublic });
    return groupUpdatesByMonth(filterUpdates(visible, filter));
  }, [filter, hubPublic]);

  return (
    <PageShell size="read" className="py-8 md:py-12" as="article">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>
        <p className="mt-4 max-w-prose leading-relaxed text-gray-700">
          {t("intro")}
        </p>
      </header>

      <div
        className="mt-8 flex flex-wrap gap-2"
        role="tablist"
        aria-label={t("filterLabel")}
      >
        {FILTERS.map((kind) => {
          const selected = filter === kind;
          return (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(kind)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
                selected
                  ? "border-opseu-blue bg-opseu-blue/5 text-opseu-dark"
                  : "border-gray-200 bg-white text-gray-600 hover:border-opseu-blue/40 hover:text-opseu-dark",
              )}
            >
              {t(`kinds.${kind}`)}
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <Callout className="mt-10" tone="muted">
          <p className="font-semibold text-opseu-dark">{t("emptyTitle")}</p>
          <p className="mt-2">{t("emptyBody")}</p>
        </Callout>
      ) : (
        <div className="mt-10 space-y-12">
          {groups.map((group) => (
            <section key={group.month} aria-labelledby={`updates-${group.month}`}>
              <h2
                id={`updates-${group.month}`}
                className="text-xl font-bold text-opseu-dark"
              >
                {formatUpdateMonth(group.month, locale)}
              </h2>
              <ol className="mt-6 space-y-8">
                {group.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-l-2 border-opseu-blue/30 pl-5"
                  >
                    <p className="text-sm font-medium text-gray-500">
                      <span className="font-semibold uppercase tracking-wide text-opseu-blue">
                        {t(`kinds.${entry.kind}`)}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <time dateTime={entry.date}>
                        {formatUpdateDate(entry.date, locale)}
                      </time>
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-opseu-dark">
                      {t(`items.${entry.id}.title`)}
                    </h3>
                    <p className="mt-2 leading-relaxed text-gray-700">
                      {t(`items.${entry.id}.body`)}
                    </p>
                    {entry.href ? (
                      <p className="mt-3">
                        <Link
                          href={entry.href}
                          className="inline-flex min-h-11 items-center font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
                        >
                          {t("openLink")}
                          <span className="sr-only">
                            {` ${t(`items.${entry.id}.title`)}`}
                          </span>
                        </Link>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      <p className="mt-12 max-w-prose text-sm text-gray-600">
        {t("feedbackLead")}{" "}
        <Link
          href="/feedback"
          className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
        >
          {t("feedbackLink")}
        </Link>
      </p>
    </PageShell>
  );
}
