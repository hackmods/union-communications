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
          <div className="mt-5 text-sm">
            {relatedLabel && (
              <p className="font-semibold text-opseu-dark">{relatedLabel}</p>
            )}
            <nav aria-label={relatedLabel}>
              <ul
                className={cn(
                  "list-disc space-y-1 pl-5 marker:text-gray-400",
                  relatedLabel ? "mt-2" : "mt-0",
                  "md:mt-1 md:flex md:flex-wrap md:list-none md:space-y-0 md:pl-0 md:items-baseline md:gap-x-3 md:gap-y-1",
                )}
              >
              {relatedLinks.map((link, i) => (
                <li
                  key={link.href}
                  className="md:inline-flex md:items-baseline md:gap-x-3"
                >
                  {i > 0 && (
                    <span
                      className="hidden text-gray-300 md:inline"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                  )}
                  <Link
                    href={link.href}
                    className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              </ul>
            </nav>
          </div>
        )}
      </header>

      <div className="mt-10">{children}</div>

      {footer}
    </PageShell>
  );
}
