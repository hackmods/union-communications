import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GuideTrainingPhaseProps = {
  id: string;
  number: string;
  title: string;
  timeEstimate: string;
  intro: string;
  children: ReactNode;
  className?: string;
};

/** Numbered training module wrapper for long-form steward playbooks. */
export function GuideTrainingPhase({
  id,
  number,
  title,
  timeEstimate,
  intro,
  children,
  className,
}: GuideTrainingPhaseProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-opseu-blue/[0.03] p-5 shadow-sm not-first:mt-10 md:p-8",
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-opseu-blue text-lg font-bold text-white"
          aria-hidden="true"
        >
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">{title}</h2>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
              {timeEstimate}
            </span>
          </div>
          <p className="mt-2 max-w-prose leading-relaxed text-gray-700">{intro}</p>
        </div>
      </div>
      <div className="mt-6 space-y-10 border-t border-gray-100 pt-6">{children}</div>
    </section>
  );
}

type GuideSubsectionProps = {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
};

/** Lighter in-phase section — avoids repeating full module chrome. */
export function GuideSubsection({
  id,
  title,
  intro,
  children,
  className,
}: GuideSubsectionProps) {
  return (
    <div id={id} className={cn("scroll-mt-28", className)}>
      <h3 className="text-lg font-bold text-opseu-dark md:text-xl">{title}</h3>
      {intro ? (
        <p className="mt-2 max-w-prose leading-relaxed text-gray-700">{intro}</p>
      ) : null}
      {children}
    </div>
  );
}
