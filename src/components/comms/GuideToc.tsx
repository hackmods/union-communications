"use client";

import clsx from "clsx";

export type GuideTocItem = {
  id: string;
  label: string;
  level?: 2 | 3;
};

type GuideTocProps = {
  items: GuideTocItem[];
  activeId?: string;
  /** Light theme for public guides; dark matches Officer Learning shell */
  variant?: "light" | "dark";
  className?: string;
};

/**
 * Anchor TOC for public guides and Officer Learning (shared nav primitive).
 */
export function GuideToc({
  items,
  activeId,
  variant = "light",
  className,
}: GuideTocProps) {
  const dark = variant === "dark";

  return (
    <nav aria-label="Table of contents" className={clsx("space-y-1", className)}>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={clsx(
            "block rounded-lg px-3 py-2 text-sm transition-colors",
            item.level === 3 && "pl-5",
            activeId === item.id
              ? dark
                ? "bg-teal-500/20 font-semibold text-teal-100"
                : "bg-opseu-blue/10 font-semibold text-opseu-dark"
              : dark
                ? "text-slate-300 hover:bg-white/5 hover:text-white"
                : "text-gray-600 hover:bg-gray-50 hover:text-opseu-dark",
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
