import type { GrievanceOutcome, GrievanceWithRelations } from "@/types/grievance";
import type { GrievanceConfig } from "@/types/tenant";
import {
  getAppealDueDate,
  getCurrentStepDueDate,
  getStepConfig,
} from "./deadlines";

export interface GrievanceBundle {
  exportedAt: string;
  grievance: GrievanceWithRelations["grievance"];
  events: GrievanceWithRelations["events"];
  notes: GrievanceWithRelations["notes"];
  outcome: GrievanceOutcome | null;
  stepConfig: GrievanceConfig["steps"];
  currentStepDueDate: string | null;
  /** Appeal window from outcome.decidedAt + step.appealDays, when both exist. */
  appealDueDate: string | null;
}

export function buildGrievanceBundle(
  data: GrievanceWithRelations & { outcome?: GrievanceOutcome | null },
  config: GrievanceConfig,
): GrievanceBundle {
  const due = getCurrentStepDueDate(
    data.grievance.filedAt,
    data.grievance.currentStep,
    config,
  );
  const outcome = data.outcome ?? null;
  const appealDue = outcome
    ? getAppealDueDate(
        outcome.decidedAt,
        data.grievance.currentStep,
        config,
      )
    : null;
  return {
    exportedAt: new Date().toISOString(),
    grievance: data.grievance,
    events: data.events,
    notes: data.notes,
    outcome,
    stepConfig: config.steps,
    currentStepDueDate: due?.toISOString() ?? null,
    appealDueDate: appealDue?.toISOString() ?? null,
  };
}

export function bundleToPdfLines(
  bundle: GrievanceBundle,
  localNumber?: string,
): string[] {
  const g = bundle.grievance;
  const step = getStepConfig(
    { steps: bundle.stepConfig },
    g.currentStep,
  );
  const lines = [
    "GRIEVANCE SUMMARY",
    "=================",
    `ID: ${g.id}`,
    `Local: ${localNumber ?? g.localId}`,
    `Category: ${g.category}`,
    `Status: ${g.status}`,
    `Current step: ${step?.name ?? g.currentStep}`,
    `Filed: ${g.filedAt}`,
    bundle.currentStepDueDate
      ? `Step deadline: ${bundle.currentStepDueDate}`
      : "Step deadline: N/A",
    g.memberPseudonym ? `Member: ${g.memberPseudonym}` : "",
    "",
    "TIMELINE",
    "--------",
  ];
  for (const evt of [...bundle.events].reverse()) {
    lines.push(
      `- ${evt.type}${evt.stepNumber ? ` (step ${evt.stepNumber})` : ""} - ${evt.createdAt}${evt.note ? `: ${evt.note}` : ""}`,
    );
  }
  lines.push("", "OFFICER NOTES", "-------------");
  for (const note of [...bundle.notes].reverse()) {
    lines.push(`[${note.createdAt}] ${note.authorName}: ${note.body}`);
  }
  if (bundle.outcome) {
    const o = bundle.outcome;
    lines.push("", "ARBITRATION / SETTLEMENT OUTCOME", "--------------------------------");
    lines.push(`Type: ${o.outcomeType}`);
    lines.push(`Decided: ${o.decidedAt}`);
    if (o.hearingDate) lines.push(`Hearing: ${o.hearingDate}`);
    if (o.arbitratorName) lines.push(`Arbitrator: ${o.arbitratorName}`);
    if (o.remedy) lines.push(`Remedy: ${o.remedy}`);
    if (o.settlementTerms) lines.push(`Settlement terms: ${o.settlementTerms}`);
    if (bundle.appealDueDate) {
      lines.push(`Appeal deadline: ${bundle.appealDueDate}`);
    }
  }
  lines.push("", `Exported: ${bundle.exportedAt}`);
  return lines.filter(Boolean);
}
