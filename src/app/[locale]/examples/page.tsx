"use client";

import { useState } from "react";
import {
  EXAMPLE_POSTS,
  CATEGORY_LABELS,
  type ExampleCategory,
} from "@/lib/constants/examples";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const categories: (ExampleCategory | "all")[] = [
  "all",
  "strike",
  "spotlight",
  "agm",
  "bargaining",
  "events",
];

export default function ExamplesPage() {
  const [filter, setFilter] = useState<ExampleCategory | "all">("all");

  const filtered =
    filter === "all"
      ? EXAMPLE_POSTS
      : EXAMPLE_POSTS.filter((p) => p.category === filter);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">The Notice Board</h1>
      <p className="mt-2 text-gray-600">
        Examples of excellent local union social media posts.
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist">
        {categories.map((cat) => (
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
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {filtered.map((post) => (
          <Card key={post.id} className="mb-4 break-inside-avoid">
            <div
              className="mb-3 h-32 rounded-lg"
              style={{ backgroundColor: post.accentColor }}
            />
            <CardTitle>{post.title}</CardTitle>
            <p className="mt-2 text-sm text-gray-600">{post.description}</p>
            <p className="mt-2 text-xs text-gray-400">{post.platform}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
