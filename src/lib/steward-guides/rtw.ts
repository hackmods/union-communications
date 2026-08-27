import {
  clearJsonDraft,
  loadJsonDraft,
  saveJsonDraft,
} from "@/lib/steward-guides/storage";

export const RTW_STORAGE_KEY = "unionops-rtw-intake-draft";

export const ACCOMMODATION_MEASURES = [
  "modifiedHours",
  "lightDuties",
  "ergonomicEquipment",
  "taskBundling",
  "alternativeLocation",
] as const;

export type AccommodationMeasureId = (typeof ACCOMMODATION_MEASURES)[number];

export const PROHIBITED_GROUNDS = [
  "creed",
  "disability",
  "familyStatus",
  "sex",
  "genderIdentity",
  "race",
  "age",
  "other",
] as const;

export type ProhibitedGroundId = (typeof PROHIBITED_GROUNDS)[number];

export type RtwMode = "rtw" | "accommodation";

export type RtwIntakeDraft = {
  mode: RtwMode;
  memberName: string;
  classification: string;
  meetingDate: string;
  hrContact: string;
  returnDate: string;
  gradualHours: string;
  wsibLtdStatus: string;
  medicalRestrictions: string;
  prohibitedGround: ProhibitedGroundId | "";
  requestedModifications: string;
  functionalLimitations: string;
  measures: AccommodationMeasureId[];
  customMeasure: string;
};

export function createEmptyRtwDraft(): RtwIntakeDraft {
  return {
    mode: "rtw",
    memberName: "",
    classification: "",
    meetingDate: "",
    hrContact: "",
    returnDate: "",
    gradualHours: "",
    wsibLtdStatus: "",
    medicalRestrictions: "",
    prohibitedGround: "",
    requestedModifications: "",
    functionalLimitations: "",
    measures: [],
    customMeasure: "",
  };
}

function isMeasureId(v: unknown): v is AccommodationMeasureId {
  return (
    typeof v === "string" &&
    (ACCOMMODATION_MEASURES as readonly string[]).includes(v)
  );
}

export function isRtwIntakeDraft(v: unknown): v is RtwIntakeDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  return (
    (d.mode === "rtw" || d.mode === "accommodation") &&
    typeof d.memberName === "string" &&
    typeof d.classification === "string" &&
    typeof d.meetingDate === "string" &&
    typeof d.hrContact === "string" &&
    typeof d.returnDate === "string" &&
    typeof d.gradualHours === "string" &&
    typeof d.wsibLtdStatus === "string" &&
    typeof d.medicalRestrictions === "string" &&
    typeof d.prohibitedGround === "string" &&
    typeof d.requestedModifications === "string" &&
    typeof d.functionalLimitations === "string" &&
    Array.isArray(d.measures) &&
    d.measures.every(isMeasureId) &&
    typeof d.customMeasure === "string"
  );
}

export function loadRtwDraft(): RtwIntakeDraft | null {
  return loadJsonDraft(RTW_STORAGE_KEY, isRtwIntakeDraft);
}

export function saveRtwDraft(draft: RtwIntakeDraft): boolean {
  return saveJsonDraft(RTW_STORAGE_KEY, draft);
}

export function clearRtwDraft(): boolean {
  return clearJsonDraft(RTW_STORAGE_KEY);
}

export type RtwScriptLabels = {
  dear: string;
  basedOn: string;
  propose: string;
  preserve: string;
  closing: string;
  verbalLead: string;
  memberFallback: string;
  hrFallback: string;
  measuresHeading: string;
  measureLabels: Record<AccommodationMeasureId, string>;
  customMeasureLabel: string;
  groundLabels: Record<ProhibitedGroundId, string>;
  groundLead: string;
};

function displayName(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function measureList(
  draft: RtwIntakeDraft,
  labels: RtwScriptLabels,
): string {
  const parts = draft.measures.map((id) => labels.measureLabels[id]);
  if (draft.customMeasure.trim()) {
    parts.push(`${labels.customMeasureLabel}: ${draft.customMeasure.trim()}`);
  }
  return parts.join("; ");
}

/** Default gradual work-hardening grid for active WSIB / LTD returns. */
export const GRADUAL_WORK_HARDENING_SCHEDULE =
  "Week 1–2: 15 hrs; Week 3–4: 22.5 hrs; Week 5–6: 30 hrs; then full hours";

const ACTIVE_WSIB_LTD_CUES =
  /\b(wsib|wsb|ltd|std|active|claim|claimant|benefits?|short[\s-]?term|long[\s-]?term|disability|return[\s-]?to[\s-]?work|rtw)\b/i;

/** True when WSIB/LTD status looks active (not empty / not clearly closed). */
export function hasActiveWsibLtd(draft: RtwIntakeDraft): boolean {
  const status = draft.wsibLtdStatus.trim();
  if (!status) return false;
  if (/^(n\/?a|none|no|closed|inactive|denied|0)$/i.test(status)) return false;
  return ACTIVE_WSIB_LTD_CUES.test(status) || status.length >= 2;
}

/** True when functional or medical restriction text is present. */
export function hasPhysicalLimits(draft: RtwIntakeDraft): boolean {
  return Boolean(
    draft.functionalLimitations.trim() || draft.medicalRestrictions.trim(),
  );
}

/** True when the steward has started any meaningful intake field. */
export function hasRtwIntakeStarted(draft: RtwIntakeDraft): boolean {
  return Boolean(
    draft.memberName.trim() ||
      draft.classification.trim() ||
      draft.meetingDate.trim() ||
      draft.hrContact.trim() ||
      draft.returnDate.trim() ||
      draft.gradualHours.trim() ||
      draft.wsibLtdStatus.trim() ||
      draft.medicalRestrictions.trim() ||
      draft.prohibitedGround ||
      draft.requestedModifications.trim() ||
      draft.functionalLimitations.trim() ||
      draft.measures.length > 0 ||
      draft.customMeasure.trim(),
  );
}

export type RtwSuggestionLabels = {
  workHardening: string;
  taskBundling: string;
  jointReview: string;
};

export type RtwEarlyResolutionSuggestion = {
  id: "workHardening" | "taskBundling" | "jointReview";
  text: string;
};

/**
 * Conditional early-resolution talking points for HR meetings.
 * Schedule / bundling only fire on their triggers; joint review once intake started.
 */
export function buildRtwEarlyResolutionSuggestions(
  draft: RtwIntakeDraft,
  labels: RtwSuggestionLabels,
): RtwEarlyResolutionSuggestion[] {
  const out: RtwEarlyResolutionSuggestion[] = [];
  if (hasActiveWsibLtd(draft)) {
    out.push({ id: "workHardening", text: labels.workHardening });
  }
  if (hasPhysicalLimits(draft)) {
    out.push({ id: "taskBundling", text: labels.taskBundling });
  }
  if (hasRtwIntakeStarted(draft)) {
    out.push({ id: "jointReview", text: labels.jointReview });
  }
  return out;
}

/** Prefill gradual hours only when empty and WSIB/LTD is active. */
export function maybePrefillGradualHours(
  draft: RtwIntakeDraft,
): RtwIntakeDraft {
  if (!hasActiveWsibLtd(draft) || draft.gradualHours.trim()) return draft;
  return { ...draft, gradualHours: GRADUAL_WORK_HARDENING_SCHEDULE };
}

/**
 * Add task bundling when physical limits are noted and no measures chosen yet.
 * Does not overwrite an existing measure selection.
 */
export function maybeSuggestTaskBundlingMeasure(
  draft: RtwIntakeDraft,
): RtwIntakeDraft {
  if (!hasPhysicalLimits(draft)) return draft;
  if (draft.measures.length > 0) return draft;
  return { ...draft, measures: ["taskBundling"] };
}

/** Build an HR email / verbal script from the current draft. */
export function buildRtwScripts(
  draft: RtwIntakeDraft,
  labels: RtwScriptLabels,
): { email: string; verbal: string } {
  const member = displayName(draft.memberName, labels.memberFallback);
  const hr = displayName(draft.hrContact, labels.hrFallback);
  const limits =
    draft.functionalLimitations.trim() ||
    draft.medicalRestrictions.trim() ||
    "—";
  const measures = measureList(draft, labels);

  let body: string;
  if (draft.mode === "rtw") {
    const schedule =
      draft.gradualHours.trim() ||
      "a phased work-hardening schedule starting at reduced hours";
    const returnDate = draft.returnDate.trim()
      ? ` starting ${draft.returnDate.trim()}`
      : "";
    body = `${labels.propose} ${schedule}${returnDate}. ${labels.basedOn} ${member}'s functional limitations (${limits}).${
      measures ? ` ${labels.measuresHeading}: ${measures}.` : ""
    } ${labels.preserve}`;
  } else {
    const ground =
      draft.prohibitedGround && draft.prohibitedGround in labels.groundLabels
        ? labels.groundLabels[draft.prohibitedGround]
        : "";
    const mods = draft.requestedModifications.trim();
    body = `${labels.groundLead}${ground ? ` (${ground})` : ""}. ${labels.basedOn} ${member}'s functional limitations (${limits}).${
      mods ? ` Requested modifications: ${mods}.` : ""
    }${measures ? ` ${labels.measuresHeading}: ${measures}.` : ""} ${labels.preserve}`;
  }

  const email = `${labels.dear} ${hr},\n\n${body}\n\n${labels.closing}`;
  const verbal = `${labels.verbalLead}\n\n${body}`;
  return { email, verbal };
}

export function rtwDraftToMarkdown(
  draft: RtwIntakeDraft,
  labels: {
    title: string;
    modeRtw: string;
    modeAccommodation: string;
    fields: Record<string, string>;
    measureLabels: Record<AccommodationMeasureId, string>;
    groundLabels: Record<ProhibitedGroundId, string>;
    scripts: RtwScriptLabels;
    earlyResolutionHeading?: string;
    suggestionLabels?: RtwSuggestionLabels;
  },
): string {
  const { email, verbal } = buildRtwScripts(draft, labels.scripts);
  const modeLabel =
    draft.mode === "rtw" ? labels.modeRtw : labels.modeAccommodation;
  const lines: string[] = [
    `# ${labels.title}`,
    "",
    `**${labels.fields.mode}:** ${modeLabel}`,
    `**${labels.fields.memberName}:** ${draft.memberName || "—"}`,
    `**${labels.fields.classification}:** ${draft.classification || "—"}`,
    `**${labels.fields.meetingDate}:** ${draft.meetingDate || "—"}`,
    `**${labels.fields.hrContact}:** ${draft.hrContact || "—"}`,
    "",
  ];

  if (draft.mode === "rtw") {
    lines.push(
      `**${labels.fields.returnDate}:** ${draft.returnDate || "—"}`,
      `**${labels.fields.gradualHours}:** ${draft.gradualHours || "—"}`,
      `**${labels.fields.wsibLtdStatus}:** ${draft.wsibLtdStatus || "—"}`,
      `**${labels.fields.medicalRestrictions}:** ${draft.medicalRestrictions || "—"}`,
      "",
    );
  } else {
    const ground =
      draft.prohibitedGround && draft.prohibitedGround in labels.groundLabels
        ? labels.groundLabels[draft.prohibitedGround]
        : "—";
    lines.push(
      `**${labels.fields.prohibitedGround}:** ${ground}`,
      `**${labels.fields.requestedModifications}:** ${draft.requestedModifications || "—"}`,
      "",
    );
  }

  lines.push(
    `**${labels.fields.functionalLimitations}:** ${draft.functionalLimitations || "—"}`,
    `**${labels.fields.measures}:** ${
      measureList(draft, {
        ...labels.scripts,
        measureLabels: labels.measureLabels,
      }) || "—"
    }`,
    "",
    `## ${labels.fields.emailScript}`,
    "",
    email,
    "",
    `## ${labels.fields.verbalScript}`,
    "",
    verbal,
    "",
  );

  if (labels.suggestionLabels && labels.earlyResolutionHeading) {
    const suggestions = buildRtwEarlyResolutionSuggestions(
      draft,
      labels.suggestionLabels,
    );
    if (suggestions.length > 0) {
      lines.push(`## ${labels.earlyResolutionHeading}`, "");
      for (const s of suggestions) {
        lines.push(`- ${s.text}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
