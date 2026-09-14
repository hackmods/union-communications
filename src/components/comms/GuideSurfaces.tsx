import type { ComponentProps, ReactNode } from "react";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type GuideCalloutProps = ComponentProps<typeof Callout>;

/**
 * Guide-facing Callout — defaults to prose measure inside playbook columns.
 * Pass measure="fill" for full article-column notes.
 */
export function GuideCallout({
  measure = "prose",
  className,
  ...props
}: GuideCalloutProps) {
  return <Callout measure={measure} className={className} {...props} />;
}

type GuideSpotlightBandProps = {
  kicker: string;
  lead: ReactNode;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Highlighted demo / path band for workshop playbooks. */
export function GuideSpotlightBand({
  kicker,
  lead,
  note,
  children,
  className,
}: GuideSpotlightBandProps) {
  return (
    <section
      className={cn(
        "mt-10 scroll-mt-28 rounded-2xl border-2 border-opseu-blue/40 bg-opseu-blue/5 p-5 sm:p-6",
        className,
      )}
      aria-label={kicker}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-opseu-blue">
        {kicker}
      </p>
      <div className="mt-1 max-w-prose text-sm leading-relaxed text-gray-700">
        {lead}
      </div>
      <div className="mt-4 rounded-xl border border-opseu-blue/20 bg-white p-4 sm:p-5">
        {children}
      </div>
      {note ? (
        <div className="mt-4 max-w-prose text-sm leading-relaxed text-gray-700">
          {note}
        </div>
      ) : null}
    </section>
  );
}

type GuideCatalogCardProps = {
  title: ReactNode;
  body: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Default h2 for top-level hubs; use h3 under an existing chapter h2. */
  titleAs?: "h2" | "h3";
  /** When set, title becomes a link (prefer over duplicating the same label in `action`). */
  href?: string;
};

/** Hub catalog row/card — workshops index and similar. */
export function GuideCatalogCard({
  title,
  body,
  meta,
  action,
  className,
  titleAs = "h2",
  href,
}: GuideCatalogCardProps) {
  const Title = titleAs;
  const titleClass =
    "text-[clamp(1.125rem,1.05rem+0.35vw,1.25rem)] font-bold text-opseu-dark";
  return (
    <li
      className={cn(
        "min-w-0 border-l-2 border-opseu-blue/30 pl-5",
        className,
      )}
    >
      <Title className={titleClass}>
        {href ? (
          <Link
            href={href}
            className="text-opseu-blue underline-offset-2 hover:text-opseu-dark hover:underline"
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </Title>
      <div className="mt-2 max-w-prose leading-relaxed text-gray-700">{body}</div>
      {meta ? <div className="mt-1 text-sm text-gray-600">{meta}</div> : null}
      {action ? <div className="button-row mt-4">{action}</div> : null}
    </li>
  );
}

type GuideLinkClusterProps = {
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
  className?: string;
  titleAs?: "h2" | "h3";
};

/**
 * Hub link cluster — related-guide groups and similar.
 * Prefer over Callout + inline · separators for multi-link discovery.
 */
export function GuideLinkCluster({
  title,
  children,
  headerAction,
  className,
  titleAs = "h2",
}: GuideLinkClusterProps) {
  const Title = titleAs;
  return (
    <li
      className={cn(
        "min-w-0 border-l-2 border-opseu-blue/30 pl-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <Title className="text-[clamp(1.125rem,1.05rem+0.35vw,1.25rem)] font-bold text-opseu-dark">
          {title}
        </Title>
        {headerAction}
      </div>
      <div className="mt-3">{children}</div>
    </li>
  );
}

type GuideLinkListProps = {
  links: { href: string; label: string }[];
  className?: string;
};

/** Stacked discovery links for GuideLinkCluster (fills the column at sm+). */
export function GuideLinkList({ links, className }: GuideLinkListProps) {
  return (
    <ul
      className={cn(
        "grid gap-1 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-1",
        className,
      )}
    >
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="inline-flex min-h-11 items-center font-medium text-opseu-blue underline-offset-2 hover:text-opseu-dark hover:underline"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
