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

export function isOverdue(dueAt: Date | null, completedAt?: string): boolean {
  if (!dueAt || completedAt) return false;
  return dueAt.getTime() < Date.now();
}

export function daysUntilDue(dueAt: Date | null): number | null {
  if (!dueAt) return null;
  const ms = dueAt.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
