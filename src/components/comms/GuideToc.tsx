"use client";

import type { MouseEvent } from "react";
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
  /** Smooth scroll to section instead of instant hash jump */
  smoothScroll?: boolean;
  className?: string;
};

/**
 * Anchor TOC for public guides and Officer Learning (shared nav primitive).
 */
export function GuideToc({
  items,
  activeId,
  variant = "light",
  smoothScroll = false,
  className,
}: GuideTocProps) {
  const dark = variant === "dark";

  const handleClick = (id: string, event: MouseEvent<HTMLAnchorElement>) => {
    if (!smoothScroll) return;
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: prefersReduced ? "instant" : "smooth",
      block: "start",
    });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav aria-label="Table of contents" className={clsx("space-y-1", className)}>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={(event) => handleClick(item.id, event)}
          className={clsx(
            "block rounded-lg px-3 py-2 text-sm transition-colors",
            item.level === 3 && "pl-5",
            activeId === item.id
              ? dark
                ? "bg-orange-500/20 font-semibold text-orange-100"
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
