"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ModuleStatus } from "@/lib/officer-learning/types";
import { useOlTheme } from "./OlThemeProvider";

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

/**
 * Officer Learning path with live progress on the dashboard.
 * Mobile: stacked steps. md+: 2→4→5 column grid so fourteen long titles
 * wrap inside the card instead of overflowing into neighbours (7-col was too narrow).
 */
export function LearningPathDiagram({ steps, label, className }: Props) {
  const olTheme = useOlTheme();
  const STATUS_RING: Record<ModuleStatus, string> = {
    completed: olTheme.statusCompleted,
    in_progress: olTheme.statusInProgress,
    not_started: olTheme.statusNotStarted,
  };

  return (
    <nav aria-label={label} className={cn(olTheme.pathNav, className)}>
      <p className={cn("mb-4", olTheme.sectionLabel)}>{label}</p>

      {/* Phone: vertical path with connectors */}
      <ol className="flex flex-col gap-3 md:hidden">
        {steps.map((step, index) => (
          <li key={step.id} className="flex min-w-0 items-stretch gap-2">
            <PathStepLink
              step={step}
              statusRing={STATUS_RING[step.status]}
              olTheme={olTheme}
            />
            {index < steps.length - 1 ? (
              <span className={olTheme.pathArrow} aria-hidden="true">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {/* md+: wider cells (2 → 4 at lg → 5 at xl) — titles line-clamp inside the card */}
      <ol className="hidden gap-2 md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {steps.map((step) => (
          <li key={step.id} className="min-w-0">
            <PathStepLink
              step={step}
              statusRing={STATUS_RING[step.status]}
              olTheme={olTheme}
              compact
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}

function PathStepLink({
  step,
  statusRing,
  olTheme,
  compact = false,
}: {
  step: PathStep;
  statusRing: string;
  olTheme: ReturnType<typeof useOlTheme>;
  compact?: boolean;
}) {
  return (
    <Link
      href={step.href}
      aria-label={step.ariaLabel}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 transition",
        olTheme.surfaceHover,
        step.status === "completed" && "border-emerald-400/30",
        step.status === "in_progress" && "border-orange-400/40",
        compact
          ? "h-full w-full flex-col items-stretch gap-1.5 overflow-hidden py-2.5"
          : "flex-1",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
          statusRing,
        )}
        aria-hidden="true"
      >
        {step.status === "completed" ? "✓" : step.number}
      </span>
      <span
        className={cn(
          olTheme.pathTitle,
          "min-w-0",
          compact
            ? "line-clamp-3 w-full break-words leading-snug"
            : "truncate",
        )}
        aria-hidden="true"
      >
        {step.title}
      </span>
    </Link>
  );
}
