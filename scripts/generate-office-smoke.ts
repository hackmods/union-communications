import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { OFFICE_PRESETS, defaultFieldsForPreset } from "../src/lib/constants/office-templates";
import {
  EVENT_RSVP_XLSX_LABELS,
  renderDocxFromPreset,
  renderDotxFromPreset,
  renderEventRsvpXlsx,
  renderGrievanceIntakeXlsx,
  renderLecDirectoryXlsx,
  renderPptx,
  renderSeniorityWorksheetXlsx,
  type GrievanceIntakeLabels,
  type SeniorityWorksheetLabels,
} from "../src/lib/export/office-export";

const outputDir = join(process.cwd(), process.argv[2] ?? ".office-smoke");
const palette = { primary: "#003366", secondary: "#001A33", accent: "#C45C26" };
const fontOptions = { headlineFontId: "montserrat" as const, bodyFontId: "sourceSans" as const };
const seniorityLabels: SeniorityWorksheetLabels = {
  sheetName: "Seniority", title: "Seniority worksheet", local: "Local", sessionDate: "Session date", chair: "Chair",
  caseId: "Case ID", notes: "Notes", disclaimer: "Aid only. Verify against the collective agreement.",
  columns: ["Member", "Date", "Classification", "Position", "Claim", "Eligible?", "Notes"], footerDecision: "Decision",
};
const grievanceLabels: GrievanceIntakeLabels = {
  sheetName: "Intake", title: "Grievance intake", local: "Local", incidentDate: "Incident date", caArticle: "CA article",
  itemCol: "Item", notesCol: "Notes", witnesses: "Witnesses", clockNotes: "Clock notes",
  disclaimer: "Aid only. Confirm deadlines in the collective agreement.",
  rows: { who: "Who", what: "What", where: "Where", when: "When", why: "Why", want: "Want" },
};
async function save(name: string, blob: Blob): Promise<void> { await writeFile(join(outputDir, name), Buffer.from(await blob.arrayBuffer())); }

async function main(): Promise<void> {
await mkdir(outputDir, { recursive: true });
for (const preset of OFFICE_PRESETS) {
  const fields = defaultFieldsForPreset(preset);
  const common = { presetId: preset.id, palette, localLabel: "Local 777", localNumber: "777", fields, ...fontOptions,
    seniorityLabels: preset.id === "seniority-worksheet" ? seniorityLabels : undefined,
    grievanceLabels: preset.id === "grievance-intake" ? grievanceLabels : undefined };
  if (preset.outputs.docx) {
    await save(`${preset.id}.docx`, await renderDocxFromPreset(common));
    await save(`${preset.id}.dotx`, await renderDotxFromPreset(common));
  }
  if (preset.outputs.pptx) await save(`${preset.id}.pptx`, await renderPptx({ ...common, title: fields.title ?? preset.id }));
  if (preset.outputs.xlsx) {
    const blob = preset.id === "seniority-worksheet"
      ? await renderSeniorityWorksheetXlsx({ palette, localNumber: "777", fields, labels: seniorityLabels, ...fontOptions })
      : preset.id === "grievance-intake"
        ? await renderGrievanceIntakeXlsx({ palette, localNumber: "777", fields, labels: grievanceLabels, ...fontOptions })
        : preset.id === "lec-directory"
          ? await renderLecDirectoryXlsx({ palette, localNumber: "777", fields, ...fontOptions })
          : await renderEventRsvpXlsx({ palette, localNumber: "777", fields, labels: EVENT_RSVP_XLSX_LABELS.en, ...fontOptions });
    await save(`${preset.id}.xlsx`, blob);
  }
}
console.log(`Generated Office smoke files in ${outputDir}`);
}

void main();

