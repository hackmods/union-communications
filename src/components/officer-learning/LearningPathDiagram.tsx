"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { olTheme } from "@/lib/officer-learning/theme";
import type { ModuleStatus } from "@/lib/officer-learning/types";

type PathStep = {
  id: string;
  number: number;
  title: string;
  /** Unique accessible name — must differ from dashboard card link labels. */
  ariaLabel: string;
  href: string;
  status: ModuleStatus;
};

type Props = {
  steps: PathStep[];
  label: string;
  className?: string;
};

const STATUS_RING: Record<ModuleStatus, string> = {
  completed: olTheme.statusCompleted,
  in_progress: olTheme.statusInProgress,
  not_started: olTheme.statusNotStarted,
};

/** Six-module learning path with live progress on the dashboard. */
export function LearningPathDiagram({ steps, label, className }: Props) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5",
        className,
      )}
    >
      <p className={cn("mb-4", olTheme.sectionLabel)}>{label}</p>
      <ol className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-stretch lg:gap-2">
        {steps.map((step, index) => (
          <li key={step.id} className="flex min-w-0 flex-1 items-stretch gap-2">
            <Link
              href={step.href}
              aria-label={step.ariaLabel}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-3 py-3 transition",
                olTheme.surfaceHover,
                step.status === "completed" && "border-emerald-400/30",
                step.status === "in_progress" && "border-orange-400/40",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
                  STATUS_RING[step.status],
                )}
                aria-hidden="true"
              >
                {step.status === "completed" ? "✓" : step.number}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white" aria-hidden="true">
                  {step.title}
                </span>
              </span>
            </Link>
            {index < steps.length - 1 ? (
              <span
                className="hidden shrink-0 self-center text-slate-500 lg:inline"
                aria-hidden="true"
              >
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
