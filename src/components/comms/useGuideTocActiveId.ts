"use client";

import { useEffect, useState } from "react";
import type { GuideTocItem } from "@/components/comms/GuideToc";

/**
 * Scroll-spy for playbook TOC — highlights the section nearest the top of the viewport.
 * Respects scroll-mt offsets already on GuideSection / GuideOutlineStep.
 */
export function useGuideTocActiveId(items: GuideTocItem[]): string | undefined {
  const [activeId, setActiveId] = useState<string | undefined>(items[0]?.id);

  useEffect(() => {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        const top = visible[0]?.target;
        if (top?.id) setActiveId(top.id);
      },
      {
        root: null,
        // Prefer the band just below sticky header / scroll-mt
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  return activeId;
}
