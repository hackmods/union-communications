import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/PageShell";
import {
  GuideRelatedLinkList,
  type GuideRelatedLink,
} from "@/components/comms/GuideRelatedLinkList";
import { cn } from "@/lib/utils";

export type { GuideRelatedLink };

type GuideLayoutProps = {
  title: string;
  subtitle?: string;
  intro?: ReactNode;
  relatedLinks?: GuideRelatedLink[];
  relatedLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Shared reading frame for public guides (`PageShell` read tier).
 * Related links stay a compact row — never a fat empty card.
 */
export function GuideLayout({
  title,
  subtitle,
  intro,
  relatedLinks,
  relatedLabel,
  children,
  footer,
  className,
}: GuideLayoutProps) {
  return (
    <PageShell size="read" className={cn("py-8 md:py-12", className)}>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-lg text-gray-600">{subtitle}</p>
        )}
        {intro && (
          <div className="mt-4 max-w-prose leading-relaxed text-gray-700">
            {intro}
          </div>
        )}
        {relatedLinks && relatedLinks.length > 0 && (
          <div className="mt-5 text-sm">
            {relatedLabel && (
              <p className="font-semibold text-opseu-dark">{relatedLabel}</p>
            )}
            <nav aria-label={relatedLabel}>
              <GuideRelatedLinkList
                links={relatedLinks}
                className={relatedLabel ? "mt-2" : undefined}
              />
            </nav>
          </div>
        )}
      </header>

      <div className="mt-10">{children}</div>

      {footer}
    </PageShell>
  );
}
