import type { ReactNode } from "react";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";
import { cn } from "@/lib/utils";

type FeatureTeaserPanelProps = {
  eyebrow?: string;
  title: string;
  body: string;
  bullets: readonly string[];
  /** Primary + secondary actions (ButtonLink / Link). */
  actions: ReactNode;
  /** Quiet tertiary line (e.g. Configuration) under the CTAs. */
  footer?: ReactNode;
  className?: string;
};

/**
 * Subtle feature plug when a Hub/Portal surface is unavailable for this
 * local — headline, short body, three bullets, CTA group. Not a sales deck.
 */
export function FeatureTeaserPanel({
  eyebrow,
  title,
  body,
  bullets,
  actions,
  footer,
  className,
}: FeatureTeaserPanelProps) {
  return (
    <div className={cn("mx-auto max-w-xl space-y-5 py-6 sm:py-8", className)}>
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wide text-opseu-blue">
          {eyebrow}
        </p>
      ) : null}
      <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{title}</h1>
      <p className="text-base text-gray-700">{body}</p>
      <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
        {bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {actions}
      </div>
      {footer ? <div className="text-sm text-gray-600">{footer}</div> : null}
    </div>
  );
}
