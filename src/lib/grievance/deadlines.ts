import type { GrievanceConfig, GrievanceStep } from "@/types/tenant";

export function getStepConfig(
  config: GrievanceConfig,
  stepNumber: number,
): GrievanceStep | undefined {
  return config.steps.find((s) => s.number === stepNumber);
}

/** Calendar-day deadline from filedAt + step responseDays */
export function calculateStepDueDate(
  filedAt: string,
  step: GrievanceStep,
): Date | null {
  if (step.responseDays == null) return null;
  const due = new Date(filedAt);
  due.setDate(due.getDate() + step.responseDays);
  return due;
}

export function getCurrentStepDueDate(
  filedAt: string,
  currentStep: number,
  config: GrievanceConfig,
): Date | null {
  const step = getStepConfig(config, currentStep);
  if (!step) return null;
  return calculateStepDueDate(filedAt, step);
}

/**
 * Appeal / judicial-review window from outcome decidedAt + step.appealDays.
 * Uses the arbitration (or current) step that defines `appealDays`.
 */
export function calculateAppealDueDate(
  decidedAt: string,
  step: GrievanceStep | undefined,
): Date | null {
  if (!step || step.appealDays == null) return null;
  const due = new Date(decidedAt);
  due.setDate(due.getDate() + step.appealDays);
  return due;
}

/** Prefer the step that declares appealDays; fall back to current step. */
export function resolveAppealStep(
  config: GrievanceConfig,
  currentStep: number,
): GrievanceStep | undefined {
  const withAppeal = config.steps.find((s) => s.appealDays != null);
  if (withAppeal) return withAppeal;
  return getStepConfig(config, currentStep);
}

export function getAppealDueDate(
  decidedAt: string,
  currentStep: number,
  config: GrievanceConfig,
): Date | null {
  return calculateAppealDueDate(
    decidedAt,
    resolveAppealStep(config, currentStep),
  );
}

export function isOverdue(dueAt: Date | null, completedAt?: string): boolean {
  if (!dueAt || completedAt) return false;
  return dueAt.getTime() < Date.now();
}

export function daysUntilDue(dueAt: Date | null): number | null {
  if (!dueAt) return null;
  const ms = dueAt.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
