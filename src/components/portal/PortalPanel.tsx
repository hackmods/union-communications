import type { ReactNode } from "react";
import {
  PUBLIC_CARD_TITLE_CLASS,
  PUBLIC_PAGE_TITLE_CLASS,
} from "@/lib/constants/public-type";
import { cn } from "@/lib/utils";

type PortalPanelProps = {
  /** Uppercase brand eyebrow above the title. */
  eyebrow?: string;
  title?: string;
  titleId?: string;
  /** `page` uses fluid page title; `section` uses card title. */
  titleLevel?: "page" | "section";
  lead?: string;
  /** Breadcrumb or other line above the eyebrow. */
  breadcrumb?: ReactNode;
  /** Right-side header actions (e.g. Mark all read). */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Skip header band; render only the gradient shell + body. */
  bare?: boolean;
  bodyClassName?: string;
};

/**
 * Shared Local Portal shell — matches Officer Hub Platform operator /
 * Officer tools panel language (soft brand gradient, eyebrow, lead).
 */
export function PortalPanel({
  eyebrow,
  title,
  titleId,
  titleLevel = "section",
  lead,
  breadcrumb,
  actions,
  children,
  className,
  bare = false,
  bodyClassName,
}: PortalPanelProps) {
  const hasHeader =
    !bare && Boolean(eyebrow || title || lead || breadcrumb || actions);
  const TitleTag = titleLevel === "page" ? "h1" : "h2";
  const titleClass =
    titleLevel === "page" ? PUBLIC_PAGE_TITLE_CLASS : PUBLIC_CARD_TITLE_CLASS;

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-opseu-blue/20 bg-gradient-to-br from-opseu-blue/[0.07] via-white to-opseu-orange/[0.05] shadow-sm",
        className,
      )}
    >
      {hasHeader ? (
        <div className="border-b border-opseu-blue/10 px-4 py-4 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {breadcrumb ? (
                <div className="mb-2 text-sm text-gray-600">{breadcrumb}</div>
              ) : null}
              {eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-opseu-blue">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <TitleTag
                  id={titleId}
                  className={cn(titleClass, eyebrow && "mt-1")}
                >
                  {title}
                </TitleTag>
              ) : null}
              {lead ? (
                <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-gray-600 sm:text-base">
                  {lead}
                </p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
            ) : null}
          </div>
        </div>
      ) : null}
      {children != null ? (
        <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
      ) : null}
    </section>
  );
}
