import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import type { PageShellSize } from "@/lib/constants/page-shell";
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
  /**
   * Default `read` for long-form chapters. Use `wide` for guide indexes /
   * link hubs so related paths can densify across the canvas.
   */
  size?: Extract<PageShellSize, "read" | "wide">;
};

/**
 * Shared reading frame for public guides.
 * Related links stay a compact row on `read`; grid on `wide`.
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
  size = "read",
}: GuideLayoutProps) {
  const wide = size === "wide";

  return (
    <PageShell size={size} className={cn("py-8 md:py-12", className)}>
      <header className={wide ? "max-w-3xl" : undefined}>
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
      </header>

      {relatedLinks && relatedLinks.length > 0 && (
        <div className={cn("text-sm", wide ? "mt-8" : "mt-5")}>
          {relatedLabel && (
            <p className="font-semibold text-opseu-dark">{relatedLabel}</p>
          )}
          <nav aria-label={relatedLabel}>
            {wide ? (
              <ul
                className={cn(
                  "mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
                  relatedLabel ? undefined : "mt-0",
                )}
              >
                {relatedLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <GuideRelatedLinkList
                links={relatedLinks}
                className={relatedLabel ? "mt-2" : undefined}
              />
            )}
          </nav>
        </div>
      )}

      <div className="mt-10">{children}</div>

      {footer}
    </PageShell>
  );
}
