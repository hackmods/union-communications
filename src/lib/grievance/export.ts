import type { GrievanceWithRelations } from "@/types/grievance";
import type { GrievanceConfig } from "@/types/tenant";
import { getCurrentStepDueDate, getStepConfig } from "./deadlines";

export interface GrievanceBundle {
  exportedAt: string;
  grievance: GrievanceWithRelations["grievance"];
  events: GrievanceWithRelations["events"];
  notes: GrievanceWithRelations["notes"];
  stepConfig: GrievanceConfig["steps"];
  currentStepDueDate: string | null;
}

export function buildGrievanceBundle(
  data: GrievanceWithRelations,
  config: GrievanceConfig,
): GrievanceBundle {
  const due = getCurrentStepDueDate(
    data.grievance.filedAt,
    data.grievance.currentStep,
    config,
  );
  return {
    exportedAt: new Date().toISOString(),
    grievance: data.grievance,
    events: data.events,
    notes: data.notes,
    stepConfig: config.steps,
    currentStepDueDate: due?.toISOString() ?? null,
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
  lines.push("", `Exported: ${bundle.exportedAt}`);
  return lines.filter(Boolean);
}
