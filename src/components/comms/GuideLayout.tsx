import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { cn } from "@/lib/utils";

export type GuideRelatedLink = {
  href: string;
  label: string;
};

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
          <nav
            className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm"
            aria-label={relatedLabel}
          >
            {relatedLabel && (
              <span className="font-semibold text-opseu-dark">{relatedLabel}</span>
            )}
            {relatedLinks.map((link, i) => (
              <span key={link.href} className="inline-flex items-baseline gap-x-3">
                {i > 0 && (
                  <span className="text-gray-300" aria-hidden="true">
                    ·
                  </span>
                )}
                <Link
                  href={link.href}
                  className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>
        )}
      </header>

      <div className="mt-10">{children}</div>

      {footer}
    </PageShell>
  );
}
