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
 * Compact progress rail for the Officer Learning dashboard.
 * Cards remain the primary catalog; this shows number + status only.
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
      <p className={cn("mb-3", olTheme.sectionLabel)}>{label}</p>
      <ol className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <li key={step.id} className="min-w-0">
            <Link
              href={step.href}
              aria-label={step.ariaLabel}
              title={step.title}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-bold transition",
                STATUS_RING[step.status],
                "hover:scale-105",
              )}
            >
              <span aria-hidden="true">
                {step.status === "completed" ? "✓" : step.number}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
