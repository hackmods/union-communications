"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import {
  RULES_OF_ORDER_ACTION_IDS,
  RULES_OF_ORDER_CATEGORIES,
  type RulesOfOrderActionId,
} from "@/lib/rules-of-order/actions";

const DETAIL_FIELDS = [
  "whatToSay",
  "canInterrupt",
  "needsSeconder",
  "isDebatable",
  "voteRequired",
] as const;

export default function RulesOfOrderPage() {
  const t = useTranslations("rulesOfOrder");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<RulesOfOrderActionId>("mainMotion");

  const normalizedQuery = query.trim().toLowerCase();

  const visibleActionIds = useMemo(() => {
    if (!normalizedQuery) return RULES_OF_ORDER_ACTION_IDS;
    return RULES_OF_ORDER_ACTION_IDS.filter((id) => {
      const haystack = [
        t(`actions.${id}.label`),
        t(`actions.${id}.whatToSay`),
        t(`categories.${getCategoryForAction(id)}.label`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, t]);

  const activeVisible =
    visibleActionIds.includes(activeId) && visibleActionIds.length > 0;

  const selectedId = activeVisible ? activeId : visibleActionIds[0];

  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-prose text-gray-600">{t("subtitle")}</p>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">{t("whenToUse")}</p>
        <p className="mt-3">
          <Link
            href="/guide/running-meetings"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-opseu-blue underline underline-offset-2"
          >
            {t("guideLink")} →
          </Link>
        </p>
      </header>

      <section
        aria-labelledby="rules-picker-heading"
        className="mt-8 max-w-3xl"
      >
        <h2
          id="rules-picker-heading"
          className="text-lg font-bold text-opseu-dark md:text-xl"
        >
          {t("pickerHeading")}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-gray-600">
          {t("pickerIntro")}
        </p>
        <div className="mt-4">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            className="max-w-xl"
          />
        </div>

        <div className="mt-5 space-y-6">
          {RULES_OF_ORDER_CATEGORIES.map((category) => {
            const categoryActions = category.actionIds.filter((id) =>
              visibleActionIds.includes(id),
            );
            if (categoryActions.length === 0) return null;

            return (
              <div key={category.id}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {t(`categories.${category.id}.label`)}
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categoryActions.map((id) => {
                    const selected = selectedId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveId(id)}
                        aria-pressed={selected}
                        className={[
                          "min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                          selected
                            ? "border-opseu-blue bg-opseu-blue text-white"
                            : "border-gray-200 bg-white text-opseu-dark hover:border-opseu-blue/40 hover:bg-opseu-blue/5",
                        ].join(" ")}
                      >
                        {t(`actions.${id}.label`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {visibleActionIds.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">{t("noResults")}</p>
        ) : null}
      </section>

      {selectedId ? (
        <Card density="compact" className="mt-8 max-w-3xl">
          <h2 className="text-xl font-bold text-opseu-dark">
            {t(`actions.${selectedId}.label`)}
          </h2>
          <dl className="mt-4 space-y-4">
            {DETAIL_FIELDS.map((field) => (
              <DetailRow
                key={field}
                label={t(`fields.${field}`)}
                value={t(`actions.${selectedId}.${field}`)}
                highlight={field === "whatToSay"}
              />
            ))}
          </dl>
        </Card>
      ) : null}

      <ToolRelatedFooter toolSlug="rules-of-order" className="mt-10" />
    </PageShell>
  );
}

function getCategoryForAction(id: RulesOfOrderActionId) {
  return (
    RULES_OF_ORDER_CATEGORIES.find((category) =>
      category.actionIds.includes(id),
    )?.id ?? "motions"
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd
        className={[
          "mt-1 leading-relaxed text-gray-800",
          highlight ? "text-base font-medium text-opseu-dark" : "text-sm",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
