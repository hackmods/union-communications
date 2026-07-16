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
import { PageShell } from "@/components/layout/PageShell";
import { cn } from "@/lib/utils";

export default function ExamplesPage() {
  const t = useTranslations("examples");
  const [filter, setFilter] = useState<ExampleCategory | "all">("all");

  const filtered =
    filter === "all"
      ? EXAMPLE_POSTS
      : EXAMPLE_POSTS.filter((p) => p.category === filter);

  return (
    <PageShell className="py-8 md:py-12">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-gray-600">{t("subtitle")}</p>
      </header>

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label={t("filterLabel")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          onClick={() => setFilter("all")}
          className={cn(
            "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
            filter === "all"
              ? "border-opseu-blue bg-opseu-blue/5 text-opseu-dark"
              : "border-gray-200 bg-white text-gray-600 hover:border-opseu-blue/40 hover:text-opseu-dark",
          )}
        >
          {t("categories.all")}
        </button>
        {EXAMPLE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={filter === cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
              filter === cat
                ? "border-opseu-blue bg-opseu-blue/5 text-opseu-dark"
                : "border-gray-200 bg-white text-gray-600 hover:border-opseu-blue/40 hover:text-opseu-dark",
            )}
          >
            {t(`categories.${cat}`)}
          </button>
        ))}
      </div>

      <div className="mt-8 columns-1 gap-5 sm:columns-2 lg:columns-3">
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
    </PageShell>
  );
}
