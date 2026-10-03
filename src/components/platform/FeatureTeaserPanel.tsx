import type { ReactNode } from "react";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
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
    <Card
      variant="ghost"
      className={cn("mx-auto max-w-2xl space-y-5", className)}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{title}</h1>
      <p className="text-base leading-relaxed text-slate-700">{body}</p>
      <ul className="grid list-none gap-3 p-0">
        {bullets.map((item) => (
          <li key={item}>
            <Card variant="elevated" density="compact">
              <p className="text-sm leading-relaxed text-slate-700">{item}</p>
            </Card>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {actions}
      </div>
      {footer ? <div className="text-sm text-slate-600">{footer}</div> : null}
    </Card>
  );
}
