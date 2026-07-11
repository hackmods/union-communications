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
import { cn } from "@/lib/utils";

export default function ExamplesPage() {
  const t = useTranslations("examples");
  const [filter, setFilter] = useState<ExampleCategory | "all">("all");

  const filtered =
    filter === "all"
      ? EXAMPLE_POSTS
      : EXAMPLE_POSTS.filter((p) => p.category === filter);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-gray-600">{t("subtitle")}</p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={t("filterLabel")}>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            filter === "all"
              ? "bg-opseu-blue text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200",
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
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              filter === cat
                ? "bg-opseu-blue text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            {t(`categories.${cat}`)}
          </button>
        ))}
      </div>

      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {filtered.map((post) => (
          <ExampleCard key={post.id} post={post} />
        ))}
      </div>

      <p className="mt-10 text-sm text-gray-600">
        {t("planPrompt")}{" "}
        <Link
          href="/guide/social-media-plan"
          className="font-medium text-opseu-blue underline hover:text-opseu-dark"
        >
          {t("planLink")}
        </Link>
      </p>
    </div>
  );
}
