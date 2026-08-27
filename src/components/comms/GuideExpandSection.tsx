import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GuideExpandSectionProps = {
  id?: string;
  title: ReactNode;
  summary?: string;
  /** When true, section starts open. Default false — keeps long playbooks scannable. */
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

/** Collapsible deep-dive block for guide playbooks (worked scenarios, toolkits). */
export function GuideExpandSection({
  id,
  title,
  summary,
  defaultOpen = false,
  children,
  className,
}: GuideExpandSectionProps) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className={cn(
        "group rounded-lg border border-gray-200 bg-gray-50/60 open:bg-white",
        className,
      )}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-opseu-dark marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          <span>{title}</span>
          <span
            aria-hidden="true"
            className="text-gray-400 transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-3">
        {summary ? (
          <p className="max-w-prose text-sm leading-relaxed text-gray-600">{summary}</p>
        ) : null}
        {children}
      </div>
    </details>
  );
}
