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
  smoothScroll = false,
  className,
}: GuideTocProps) {
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
              ? "bg-opseu-blue/10 font-semibold text-opseu-dark"
              : "text-gray-600 hover:bg-gray-50 hover:text-opseu-dark",
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
