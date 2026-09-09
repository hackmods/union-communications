"use client";

import { useRef, type ReactNode } from "react";
import { GuideToc, type GuideTocItem } from "@/components/comms/GuideToc";
import { useGuideTocActiveId } from "@/components/comms/useGuideTocActiveId";

type GuidePlaybookTocProps = {
  items: GuideTocItem[];
  label: string;
  /** Desktop sticky rail chrome */
  variant: "mobile" | "desktop";
  aside?: ReactNode;
};

/**
 * Shared playbook TOC — scroll-spy, smooth scroll, mobile details a11y.
 */
export function GuidePlaybookToc({
  items,
  label,
  variant,
  aside,
}: GuidePlaybookTocProps) {
  const activeId = useGuideTocActiveId(items);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const toc = (
    <GuideToc items={items} activeId={activeId} smoothScroll />
  );

  if (variant === "mobile") {
    return (
      <div className="mt-6 border-b border-gray-200 pb-6 lg:hidden print:hidden">
        <details
          ref={detailsRef}
          className="rounded-xl border border-gray-200 bg-gray-50/80 open:pb-2"
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-opseu-dark outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            {label}
          </summary>
          <div
            className="max-h-64 overflow-y-auto px-2 pb-2"
            onClick={(event) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest("a") && detailsRef.current) {
                detailsRef.current.open = false;
              }
            }}
          >
            {toc}
          </div>
        </details>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-opseu-blue">
          {label}
        </p>
        {toc}
      </div>
      {aside}
    </>
  );
}
