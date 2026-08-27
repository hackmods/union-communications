"use client";

import { cn } from "@/lib/utils";
import type {
  DiagnosticPointId,
  YesNoUnset,
} from "@/lib/steward-guides/complaint-diagnostic";
import { DIAGNOSTIC_POINTS } from "@/lib/steward-guides/complaint-diagnostic";

type ViabilityScorecardProps = {
  answers: Record<DiagnosticPointId, YesNoUnset>;
  labels: Record<DiagnosticPointId, string>;
  scoreLabel: string;
  score: number;
  className?: string;
};

const TONE: Record<YesNoUnset, string> = {
  yes: "border-green-500 bg-green-50 text-green-950",
  no: "border-gray-300 bg-gray-50 text-gray-600",
  unset: "border-amber-300 bg-amber-50/80 text-amber-950",
};

/** Five-segment visual for the Grievance Viability Index. */
export function ViabilityScorecard({
  answers,
  labels,
  scoreLabel,
  score,
  className,
}: ViabilityScorecardProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-semibold text-opseu-dark">
        {scoreLabel}: {score} / 5
      </p>
      <ul
        className="grid gap-1.5 sm:grid-cols-5"
        aria-label={`${scoreLabel}: ${score} / 5`}
      >
        {DIAGNOSTIC_POINTS.map((id, index) => {
          const state = answers[id];
          return (
            <li
              key={id}
              className={cn(
                "rounded-md border px-2 py-2 text-center text-xs font-medium leading-snug",
                TONE[state],
              )}
              title={labels[id]}
            >
              <span className="block text-[0.65rem] uppercase tracking-wide opacity-80">
                {index + 1}
              </span>
              <span className="mt-0.5 line-clamp-3">{labels[id]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
