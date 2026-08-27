import {
  clearJsonDraft,
  loadJsonDraft,
  saveJsonDraft,
} from "@/lib/steward-guides/storage";

export const PRE_DISCIPLINARY_STORAGE_KEY = "unionops-pre-disciplinary-draft";

export const RIGHTS_CHECKS = [
  "advanceNotice",
  "representation",
  "disclosure",
] as const;

export type RightsCheckId = (typeof RIGHTS_CHECKS)[number];

export const MITIGATING_FACTORS = [
  "lengthOfService",
  "cleanPastRecord",
  "provocation",
  "personalMedicalDistress",
  "sincereRemorse",
] as const;

export type MitigatingFactorId = (typeof MITIGATING_FACTORS)[number];

export const ALLEGATION_TYPES = [
  "attendance",
  "insubordination",
  "performance",
  "harassment",
  "theft",
  "fraud",
  "criminal",
  "other",
] as const;

export type AllegationTypeId = (typeof ALLEGATION_TYPES)[number];

export const CRIMINAL_ALLEGATION_TYPES: readonly AllegationTypeId[] = [
  "theft",
  "fraud",
  "criminal",
];

export type TriState = "yes" | "no" | "unset";

export type PreDisciplinaryDraft = {
  memberName: string;
  meetingDate: string;
  allegationType: AllegationTypeId | "";
  allegations: string;
  memberNarrative: string;
  /** Prior progressive steps already on file (dates / labels). */
  priorSteps: string;
  rights: Record<RightsCheckId, TriState>;
  mitigators: MitigatingFactorId[];
};

export function createEmptyPreDisciplinaryDraft(): PreDisciplinaryDraft {
  return {
    memberName: "",
    meetingDate: "",
    allegationType: "",
    allegations: "",
    memberNarrative: "",
    priorSteps: "",
    rights: {
      advanceNotice: "unset",
      representation: "unset",
      disclosure: "unset",
    },
    mitigators: [],
  };
}

function isMitigatorId(v: unknown): v is MitigatingFactorId {
  return (
    typeof v === "string" &&
    (MITIGATING_FACTORS as readonly string[]).includes(v)
  );
}

function isTriState(v: unknown): v is TriState {
  return v === "yes" || v === "no" || v === "unset";
}

export function isPreDisciplinaryDraft(v: unknown): v is PreDisciplinaryDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  if (
    typeof d.memberName !== "string" ||
    typeof d.meetingDate !== "string" ||
    typeof d.allegationType !== "string" ||
    typeof d.allegations !== "string" ||
    typeof d.memberNarrative !== "string" ||
    !d.rights ||
    typeof d.rights !== "object" ||
    !Array.isArray(d.mitigators)
  ) {
    return false;
  }
  if (d.priorSteps !== undefined && typeof d.priorSteps !== "string") {
    return false;
  }
  const rights = d.rights as Record<string, unknown>;
  for (const id of RIGHTS_CHECKS) {
    if (!isTriState(rights[id])) return false;
  }
  return d.mitigators.every(isMitigatorId);
}

export function loadPreDisciplinaryDraft(): PreDisciplinaryDraft | null {
  const raw = loadJsonDraft(PRE_DISCIPLINARY_STORAGE_KEY, isPreDisciplinaryDraft);
  if (!raw) return null;
  return {
    ...createEmptyPreDisciplinaryDraft(),
    ...raw,
    priorSteps: raw.priorSteps ?? "",
  };
}

export function savePreDisciplinaryDraft(draft: PreDisciplinaryDraft): boolean {
  return saveJsonDraft(PRE_DISCIPLINARY_STORAGE_KEY, draft);
}

export function clearPreDisciplinaryDraft(): boolean {
  return clearJsonDraft(PRE_DISCIPLINARY_STORAGE_KEY);
}

export function isCriminalAllegation(
  type: AllegationTypeId | "",
): boolean {
  return (
    type !== "" &&
    (CRIMINAL_ALLEGATION_TYPES as readonly string[]).includes(type)
  );
}

export function incompleteRights(draft: PreDisciplinaryDraft): RightsCheckId[] {
  return RIGHTS_CHECKS.filter((id) => draft.rights[id] !== "yes");
}

/** Advance notice or representation marked no — log as a procedural defect. */
export function hasProceduralDefect(draft: PreDisciplinaryDraft): boolean {
  return (
    draft.rights.advanceNotice === "no" ||
    draft.rights.representation === "no"
  );
}

const CRIMINAL_KEYWORD_PATTERN =
  /\b(theft|steal|stole|stolen|fraud|embezzl|police|criminal|charged|arrest|crown|prosecutor|vol|fraude|police|criminel|accus|arrêté|arrestation)\b/i;

/** Scan free-text allegations / narrative for criminal-liability cues (EN/FR). */
export function detectCriminalKeywords(...texts: string[]): boolean {
  return texts.some((text) => CRIMINAL_KEYWORD_PATTERN.test(text));
}

export function shouldEscalateCriminal(draft: PreDisciplinaryDraft): boolean {
  return (
    isCriminalAllegation(draft.allegationType) ||
    detectCriminalKeywords(draft.allegations, draft.memberNarrative)
  );
}

/** Insubordination path when not in criminal-escalation mode. */
export function suggestObeyNowGrieveLater(
  draft: PreDisciplinaryDraft,
): boolean {
  if (shouldEscalateCriminal(draft)) return false;
  return draft.allegationType === "insubordination";
}

/** Minor path: not criminal, at least one mitigator, and rights mostly met. */
export function suggestLetterOfCounsel(draft: PreDisciplinaryDraft): boolean {
  if (shouldEscalateCriminal(draft)) return false;
  if (suggestObeyNowGrieveLater(draft)) return false;
  if (draft.mitigators.length === 0) return false;
  const minorTypes: AllegationTypeId[] = [
    "attendance",
    "performance",
    "other",
  ];
  if (
    draft.allegationType &&
    !(minorTypes as readonly string[]).includes(draft.allegationType)
  ) {
    return false;
  }
  return incompleteRights(draft).length <= 1;
}

export type PreDisciplinaryScriptLabels = {
  counselProposal: string;
  obeyNowGrieveLaterProposal: string;
  representationPoints: string;
  checklistGapsLead: string;
  rightsLabels: Record<RightsCheckId, string>;
  mitigatorLabels: Record<MitigatingFactorId, string>;
  allegationTypeLabels: Record<AllegationTypeId, string>;
  none: string;
};

export function buildPreDisciplinaryScripts(
  draft: PreDisciplinaryDraft,
  labels: PreDisciplinaryScriptLabels,
): { primary: string; gaps: string } {
  const gaps = incompleteRights(draft);
  const gapText =
    gaps.length === 0
      ? labels.none
      : gaps.map((id) => labels.rightsLabels[id]).join("; ");
  const gapsLine = `${labels.checklistGapsLead} ${gapText}`;

  // Criminal escalation is handled in the UI banner; keep representation text.
  if (shouldEscalateCriminal(draft)) {
    return {
      primary: labels.representationPoints,
      gaps: gapsLine,
    };
  }

  if (suggestObeyNowGrieveLater(draft)) {
    return {
      primary: labels.obeyNowGrieveLaterProposal,
      gaps: gapsLine,
    };
  }

  if (suggestLetterOfCounsel(draft)) {
    return {
      primary: labels.counselProposal,
      gaps: gapsLine,
    };
  }

  return {
    primary: labels.representationPoints,
    gaps: gapsLine,
  };
}

export function preDisciplinaryDraftToMarkdown(
  draft: PreDisciplinaryDraft,
  labels: {
    title: string;
    fields: Record<string, string>;
    scripts: PreDisciplinaryScriptLabels;
  },
): string {
  const { primary, gaps } = buildPreDisciplinaryScripts(draft, labels.scripts);
  const typeLabel =
    draft.allegationType &&
    draft.allegationType in labels.scripts.allegationTypeLabels
      ? labels.scripts.allegationTypeLabels[draft.allegationType]
      : "—";

  const rightsLines = RIGHTS_CHECKS.map((id) => {
    const state = draft.rights[id];
    return `- ${labels.scripts.rightsLabels[id]}: ${state}`;
  });

  const mitigatorLines =
    draft.mitigators.length === 0
      ? ["- —"]
      : draft.mitigators.map(
          (id) => `- ${labels.scripts.mitigatorLabels[id]}`,
        );

  return [
    `# ${labels.title}`,
    "",
    `**${labels.fields.memberName}:** ${draft.memberName || "—"}`,
    `**${labels.fields.meetingDate}:** ${draft.meetingDate || "—"}`,
    `**${labels.fields.allegationType}:** ${typeLabel}`,
    `**${labels.fields.priorSteps}:** ${draft.priorSteps || "—"}`,
    "",
    `## ${labels.fields.rights}`,
    ...rightsLines,
    "",
    `## ${labels.fields.allegations}`,
    draft.allegations || "—",
    "",
    `## ${labels.fields.memberNarrative}`,
    draft.memberNarrative || "—",
    "",
    `## ${labels.fields.mitigators}`,
    ...mitigatorLines,
    "",
    `## ${labels.fields.suggestion}`,
    primary,
    "",
    gaps,
    "",
  ].join("\n");
}
