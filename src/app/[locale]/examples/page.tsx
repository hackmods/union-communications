"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  EXAMPLE_CATEGORIES,
  EXAMPLE_POSTS,
  type ExampleCategory,
} from "@/lib/constants/examples";
import { ExampleCard } from "@/components/examples/ExampleCard";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { useWorkshopDemoSession } from "@/hooks/use-workshop-demo-session";
import { cn } from "@/lib/utils";

function ExampleFilters({
  filter,
  onFilter,
  label,
  allLabel,
  categories,
  categoryLabels,
}: {
  filter: ExampleCategory | "all";
  onFilter: (value: ExampleCategory | "all") => void;
  label: string;
  allLabel: string;
  categories: readonly ExampleCategory[];
  categoryLabels: Record<ExampleCategory, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={label}>
      <button
        type="button"
        role="tab"
        aria-selected={filter === "all"}
        onClick={() => onFilter("all")}
        className={cn(
          "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
          filter === "all"
            ? "border-opseu-blue bg-opseu-blue/5 text-opseu-dark"
            : "border-gray-200 bg-white text-gray-600 hover:border-opseu-blue/40 hover:text-opseu-dark",
        )}
      >
        {allLabel}
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          role="tab"
          aria-selected={filter === cat}
          onClick={() => onFilter(cat)}
          className={cn(
            "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
            filter === cat
              ? "border-opseu-blue bg-opseu-blue/5 text-opseu-dark"
              : "border-gray-200 bg-white text-gray-600 hover:border-opseu-blue/40 hover:text-opseu-dark",
          )}
        >
          {categoryLabels[cat]}
        </button>
      ))}
    </div>
  );
}

export default function ExamplesPage() {
  const t = useTranslations("examples");
  const inDemo = useWorkshopDemoSession(null);
  const [filter, setFilter] = useState<ExampleCategory | "all">("all");

  const filtered =
    filter === "all"
      ? EXAMPLE_POSTS
      : EXAMPLE_POSTS.filter((p) => p.category === filter);

  const categoryLabels = Object.fromEntries(
    EXAMPLE_CATEGORIES.map((cat) => [cat, t(`categories.${cat}`)]),
  ) as Record<ExampleCategory, string>;

  const filters = (
    <ExampleFilters
      filter={filter}
      onFilter={setFilter}
      label={t("filterLabel")}
      allLabel={t("categories.all")}
      categories={EXAMPLE_CATEGORIES}
      categoryLabels={categoryLabels}
    />
  );

  return (
    <ComposedPageLayout composition="sidebar-left" size="wide" className="py-8 md:py-12">
      {inDemo ? (
        <WorkshopDemoPath variant="trail" className="mb-4" />
      ) : null}
      <header className="max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-gray-600">{t("subtitle")}</p>
      </header>

      <div className="mt-6 lg:hidden">{filters}</div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(240px,22%)] lg:items-start">
        <div className="min-w-0">
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-2 xl:columns-3 2xl:columns-4 xl:gap-6">
            {filtered.map((post) => (
              <ExampleCard key={post.id} post={post} />
            ))}
          </div>

          <p className="mt-10 max-w-prose text-sm text-gray-600">
            {t("planPrompt")}{" "}
            <Link
              href="/guide/social-media-plan"
              className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
            >
              {t("planLink")}
            </Link>
          </p>
        </div>

        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-28 space-y-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t("filterLabel")}
            </p>
            {filters}
          </div>
        </aside>
      </div>
    </ComposedPageLayout>
  );
}
