import {
  clearJsonDraft,
  loadJsonDraft,
  saveJsonDraft,
} from "@/lib/steward-guides/storage";

export const COMPLAINT_DIAGNOSTIC_STORAGE_KEY =
  "unionops-complaint-diagnostic-draft";

export const DIAGNOSTIC_POINTS = [
  "caViolation",
  "misinterpretation",
  "statutory",
  "pastPractice",
  "memberRights",
] as const;

export type DiagnosticPointId = (typeof DIAGNOSTIC_POINTS)[number];

export const ALTERNATE_ROUTES = [
  "lmc",
  "jhsc",
  "informalSupervisor",
  "mobilization",
] as const;

export type AlternateRouteId = (typeof ALTERNATE_ROUTES)[number];

export type YesNoUnset = "yes" | "no" | "unset";

export type ComplaintDiagnosticDraft = {
  answers: Record<DiagnosticPointId, YesNoUnset>;
  articleSection: string;
  who: string;
  what: string;
  when: string;
  where: string;
  why: string;
  want: string;
  alternateRoutes: AlternateRouteId[];
};

export function createEmptyComplaintDraft(): ComplaintDiagnosticDraft {
  return {
    answers: {
      caViolation: "unset",
      misinterpretation: "unset",
      statutory: "unset",
      pastPractice: "unset",
      memberRights: "unset",
    },
    articleSection: "",
    who: "",
    what: "",
    when: "",
    where: "",
    why: "",
    want: "",
    alternateRoutes: [],
  };
}

function isYesNoUnset(v: unknown): v is YesNoUnset {
  return v === "yes" || v === "no" || v === "unset";
}

function isAlternateRouteId(v: unknown): v is AlternateRouteId {
  return (
    typeof v === "string" &&
    (ALTERNATE_ROUTES as readonly string[]).includes(v)
  );
}

export function isComplaintDiagnosticDraft(
  v: unknown,
): v is ComplaintDiagnosticDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  if (
    !d.answers ||
    typeof d.answers !== "object" ||
    typeof d.articleSection !== "string" ||
    typeof d.who !== "string" ||
    typeof d.what !== "string" ||
    typeof d.when !== "string" ||
    typeof d.where !== "string" ||
    typeof d.why !== "string" ||
    typeof d.want !== "string" ||
    !Array.isArray(d.alternateRoutes)
  ) {
    return false;
  }
  const answers = d.answers as Record<string, unknown>;
  for (const id of DIAGNOSTIC_POINTS) {
    if (!isYesNoUnset(answers[id])) return false;
  }
  return d.alternateRoutes.every(isAlternateRouteId);
}

export function loadComplaintDraft(): ComplaintDiagnosticDraft | null {
  return loadJsonDraft(
    COMPLAINT_DIAGNOSTIC_STORAGE_KEY,
    isComplaintDiagnosticDraft,
  );
}

export function saveComplaintDraft(draft: ComplaintDiagnosticDraft): boolean {
  return saveJsonDraft(COMPLAINT_DIAGNOSTIC_STORAGE_KEY, draft);
}

export function clearComplaintDraft(): boolean {
  return clearJsonDraft(COMPLAINT_DIAGNOSTIC_STORAGE_KEY);
}

/** Count of Yes answers — Grievance Viability Index (0–5). */
export function grievanceViabilityIndex(
  draft: ComplaintDiagnosticDraft,
): number {
  return DIAGNOSTIC_POINTS.filter((id) => draft.answers[id] === "yes").length;
}

export function unlocksGrievanceForm(score: number): boolean {
  return score >= 1;
}

export type ComplaintScriptLabels = {
  pointLabels: Record<DiagnosticPointId, string>;
  routeLabels: Record<AlternateRouteId, string>;
  routeDrafts: Record<AlternateRouteId, string>;
  grievanceDraftHeading: string;
  who: string;
  what: string;
  when: string;
  where: string;
  why: string;
  want: string;
  article: string;
  indexLabel: string;
  grievancePath: string;
  alternatePath: string;
};

export function buildGrievanceDraftText(
  draft: ComplaintDiagnosticDraft,
  labels: ComplaintScriptLabels,
): string {
  const yesPoints = DIAGNOSTIC_POINTS.filter(
    (id) => draft.answers[id] === "yes",
  ).map((id) => labels.pointLabels[id]);

  return [
    labels.grievanceDraftHeading,
    "",
    `${labels.article}: ${draft.articleSection.trim() || "—"}`,
    `${labels.who}: ${draft.who.trim() || "—"}`,
    `${labels.what}: ${draft.what.trim() || "—"}`,
    `${labels.when}: ${draft.when.trim() || "—"}`,
    `${labels.where}: ${draft.where.trim() || "—"}`,
    `${labels.why}: ${draft.why.trim() || "—"}`,
    `${labels.want}: ${draft.want.trim() || "—"}`,
    "",
    yesPoints.length ? `Eligibility points: ${yesPoints.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildAlternateRouteDrafts(
  draft: ComplaintDiagnosticDraft,
  labels: ComplaintScriptLabels,
): { id: AlternateRouteId; label: string; draft: string }[] {
  return draft.alternateRoutes.map((id) => ({
    id,
    label: labels.routeLabels[id],
    draft: labels.routeDrafts[id],
  }));
}

export function complaintDraftToMarkdown(
  draft: ComplaintDiagnosticDraft,
  labels: {
    title: string;
    scripts: ComplaintScriptLabels;
  },
): string {
  const score = grievanceViabilityIndex(draft);
  const answerLines = DIAGNOSTIC_POINTS.map((id) => {
    return `- ${labels.scripts.pointLabels[id]}: ${draft.answers[id]}`;
  });

  const lines: string[] = [
    `# ${labels.title}`,
    "",
    `**${labels.scripts.indexLabel}:** ${score} / 5`,
    "",
    ...answerLines,
    "",
  ];

  if (unlocksGrievanceForm(score)) {
    lines.push(
      labels.scripts.grievancePath,
      "",
      buildGrievanceDraftText(draft, labels.scripts),
      "",
    );
  } else {
    lines.push(labels.scripts.alternatePath, "");
    for (const route of buildAlternateRouteDrafts(draft, labels.scripts)) {
      lines.push(`### ${route.label}`, "", route.draft, "");
    }
  }

  return lines.join("\n");
}
