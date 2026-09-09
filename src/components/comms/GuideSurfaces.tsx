import type { ComponentProps, ReactNode } from "react";
import { Callout } from "@/components/ui/Callout";
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
  title: string;
  body: ReactNode;
  meta?: ReactNode;
  action: ReactNode;
  className?: string;
};

/** Hub catalog row/card — workshops index and similar. */
export function GuideCatalogCard({
  title,
  body,
  meta,
  action,
  className,
}: GuideCatalogCardProps) {
  return (
    <li
      className={cn(
        "min-w-0 border-l-2 border-opseu-blue/30 pl-5",
        className,
      )}
    >
      <h2 className="text-[clamp(1.125rem,1.05rem+0.35vw,1.25rem)] font-bold text-opseu-dark">
        {title}
      </h2>
      <div className="mt-2 max-w-prose leading-relaxed text-gray-700">{body}</div>
      {meta ? <div className="mt-1 text-sm text-gray-600">{meta}</div> : null}
      <div className="button-row mt-4">{action}</div>
    </li>
  );
}
