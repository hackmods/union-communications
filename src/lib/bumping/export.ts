import type { BumpingCaseWithRelations } from "@/types/bumping";
import { DEFAULT_BUMPING_CHECKLIST } from "./checklist";
import { diffLines, positionToCompareText } from "./diff";

export interface BumpingExportBundle {
  exportedAt: string;
  case: BumpingCaseWithRelations["bumpingCase"];
  sessions: BumpingCaseWithRelations["sessions"];
  notes: BumpingCaseWithRelations["notes"];
  decision: BumpingCaseWithRelations["decision"];
  checklistLabels: { id: string; checked: boolean | null }[];
  comparisonDiff: ReturnType<typeof diffLines>;
}

export function buildBumpingExportBundle(
  data: BumpingCaseWithRelations,
): BumpingExportBundle {
  const left = positionToCompareText(data.bumpingCase.incumbentPosition);
  const right = positionToCompareText(data.bumpingCase.bumpingPosition);
  return {
    exportedAt: new Date().toISOString(),
    case: data.bumpingCase,
    sessions: data.sessions,
    notes: data.notes,
    decision: data.decision,
    checklistLabels: DEFAULT_BUMPING_CHECKLIST.map((item) => ({
      id: item.id,
      checked: data.bumpingCase.checklist[item.id] ?? null,
    })),
    comparisonDiff: diffLines(left, right),
  };
}

export function bundleToPdfLines(bundle: BumpingExportBundle): string[] {
  const c = bundle.case;
  const lines = [
    "STABILITY COMMITTEE DECISION LOG",
    "================================",
    `Case ID: ${c.id}`,
    `Member: ${c.memberRef}`,
    `Seniority: ${c.seniorityDate}`,
    `Current: ${c.currentPosition}`,
    `Target: ${c.targetPosition}`,
    `Scenario: ${c.scenario}`,
    `Status: ${c.status}`,
    "",
    "CHECKLIST",
    "---------",
  ];

  for (const item of bundle.checklistLabels) {
    const val =
      item.checked === true ? "Yes" : item.checked === false ? "No" : "Pending";
    lines.push(`- ${item.id}: ${val}`);
  }

  lines.push("", "COMMITTEE SESSIONS", "------------------");
  for (const s of bundle.sessions) {
    lines.push(`[${s.date}] ${s.agenda}`);
    lines.push(`  Attendees: ${s.attendees.join(", ")}`);
  }

  lines.push("", "NOTES", "-----");
  for (const n of bundle.notes) {
    lines.push(`[${n.createdAt}] ${n.authorName}: ${n.body}`);
  }

  if (bundle.decision) {
    lines.push("", "DECISION", "--------");
    lines.push(`Outcome: ${bundle.decision.outcome}`);
    lines.push(`Rationale: ${bundle.decision.rationale}`);
    if (bundle.decision.dissentNotes) {
      lines.push(`Dissent: ${bundle.decision.dissentNotes}`);
    }
  }

  lines.push("", `Exported: ${bundle.exportedAt}`);
  lines.push("", "DISCLAIMER: This log assists committee process — not legal advice.");
  return lines;
}
