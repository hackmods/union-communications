"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ModuleStatus } from "@/lib/officer-learning/types";

type PathStep = {
  id: string;
  number: number;
  title: string;
  href: string;
  status: ModuleStatus;
};

type Props = {
  steps: PathStep[];
  label: string;
  className?: string;
};

const STATUS_RING: Record<ModuleStatus, string> = {
  completed: "border-emerald-400 bg-emerald-500 text-slate-950",
  in_progress: "border-teal-300 bg-teal-500/90 text-slate-950",
  not_started: "border-white/30 bg-slate-900 text-slate-200",
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
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">
        {label}
      </p>
      <ol className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-stretch lg:gap-2">
        {steps.map((step, index) => (
          <li key={step.id} className="flex min-w-0 flex-1 items-stretch gap-2">
            <Link
              href={step.href}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-3 py-3 transition",
                "border-white/10 bg-slate-950/40 hover:border-teal-400/40 hover:bg-slate-900/80",
                step.status === "completed" && "border-emerald-400/30",
                step.status === "in_progress" && "border-teal-400/40",
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
                <span className="block truncate text-sm font-semibold text-white">
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
