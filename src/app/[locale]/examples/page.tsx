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
    <PageShell className="py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-opseu-dark">
          {t("title")}
        </h1>
        <p className="mt-2 text-gray-600">{t("subtitle")}</p>
      </header>

      <div
        className="mt-6 flex flex-wrap gap-x-1 gap-y-2 border-b border-gray-200"
        role="tablist"
        aria-label={t("filterLabel")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          onClick={() => setFilter("all")}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            filter === "all"
              ? "border-opseu-blue text-opseu-dark"
              : "border-transparent text-gray-600 hover:text-opseu-dark",
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
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              filter === cat
                ? "border-opseu-blue text-opseu-dark"
                : "border-transparent text-gray-600 hover:text-opseu-dark",
            )}
          >
            {t(`categories.${cat}`)}
          </button>
        ))}
      </div>

      <div className="mt-8 columns-1 gap-5 sm:columns-2">
        {filtered.map((post) => (
          <ExampleCard key={post.id} post={post} />
        ))}
      </div>

      <p className="mt-10 text-sm text-gray-600">
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
