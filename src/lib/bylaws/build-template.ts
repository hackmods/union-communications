/**
 * Local bylaw boilerplate for the public Bylaw Builder.
 * All generation stays on-device; this helper only interpolates form values.
 */

import {
  BYLAW_ARTICLE_KEYS,
  type BylawArticleKey,
  type BylawArticleOverrides,
  type BylawArticleSet,
  type BylawBuilderMode,
} from "./articles";

export type {
  BylawArticleKey,
  BylawArticleOverrides,
  BylawArticleSet,
  BylawBuilderMode,
};

export type BylawFormValues = {
  localName: string;
  vicePresidents: string;
  stewards: string;
  gmmQuorum: string;
  lecQuorum: string;
  signingOfficers: string;
  trustees: string;
  meetingFrequency: string;
  electionTerm: string;
  amendmentNotice: string;
  fiscalYearEnd: string;
};

export type BylawDraft = BylawFormValues & {
  mode: BylawBuilderMode;
  articleSet: BylawArticleSet;
  articleOverrides: BylawArticleOverrides;
  committeeNotes: BylawArticleOverrides;
  existingBylaws: string;
};

export type BylawPresetId = "small" | "campus" | "opseuCaat" | "large";

export const BYLAW_PRESET_IDS: readonly BylawPresetId[] = [
  "small",
  "campus",
  "opseuCaat",
  "large",
] as const;

const OPSEU_CAAT_PRESET: BylawFormValues = {
  localName: "OPSEU / SEFPO Local 243",
  vicePresidents: "2",
  stewards:
    "One steward per campus unit, plus one Chief Steward elected by the stewards",
  gmmQuorum: "25 members in good standing or 10% of the membership, whichever is less",
  lecQuorum: "50% of the Local Executive Committee, including the President or a Vice-President",
  signingOfficers:
    "President and Treasurer, or either with one Vice-President as authorized by the LEC",
  trustees: "Three elected trustees who are not signing officers on the LEC",
  meetingFrequency:
    "At least one General Membership Meeting each month during the academic year, plus special meetings as required",
  electionTerm: "Two years, staggered where practicable for stewards and trustees",
  amendmentNotice:
    "21 days written notice to every member, posted on union boards and emailed where members have consented",
  fiscalYearEnd: "March 31",
};

/** Demo values for workshop / sample fill — not a real local. */
export const BYLAW_PRESETS: Record<BylawPresetId, BylawFormValues> = {
  small: {
    localName: "OPSEU / SEFPO Local 123",
    vicePresidents: "1",
    stewards: "One steward per department or shift",
    gmmQuorum: "15 members in good standing",
    lecQuorum: "A majority of LEC officers",
    signingOfficers: "Any two of President, Treasurer, and Vice-President",
    trustees: "Three elected trustees",
    meetingFrequency: "At least four General Membership Meetings per year",
    electionTerm: "Two years",
    amendmentNotice: "30 days written notice to the membership",
    fiscalYearEnd: "December 31",
  },
  campus: OPSEU_CAAT_PRESET,
  opseuCaat: OPSEU_CAAT_PRESET,
  large: {
    localName: "Local Union 1000",
    vicePresidents: "3",
    stewards: "One steward per 50 members, elected by unit",
    gmmQuorum: "50 members or 5% of the membership, whichever is less",
    lecQuorum:
      "A majority of LEC officers including the President or designate",
    signingOfficers:
      "Any two of President, Secretary-Treasurer, and First Vice-President",
    trustees: "Three elected trustees with annual audit duties",
    meetingFrequency: "At least six General Membership Meetings per year",
    electionTerm: "Three years",
    amendmentNotice: "30 days written notice to every member",
    fiscalYearEnd: "December 31",
  },
};

export type BylawTemplateLabels = {
  placeholders: BylawFormValues;
  articles: Record<BylawArticleKey, string>;
};

export type BuildBylawTemplateOptions = {
  articleSet?: BylawArticleSet;
  opseuArticles?: Record<BylawArticleKey, string>;
  articleOverrides?: BylawArticleOverrides;
};

function fill(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function interpolateArticle(
  template: string,
  values: BylawFormValues,
  placeholders: BylawFormValues,
): string {
  const localName = fill(values.localName, placeholders.localName);
  const vicePresidents = fill(
    values.vicePresidents,
    placeholders.vicePresidents,
  );
  const stewards = fill(values.stewards, placeholders.stewards);
  const gmmQuorum = fill(values.gmmQuorum, placeholders.gmmQuorum);
  const lecQuorum = fill(values.lecQuorum, placeholders.lecQuorum);
  const signingOfficers = fill(
    values.signingOfficers,
    placeholders.signingOfficers,
  );
  const trustees = fill(values.trustees, placeholders.trustees);
  const meetingFrequency = fill(
    values.meetingFrequency,
    placeholders.meetingFrequency,
  );
  const electionTerm = fill(
    values.electionTerm,
    placeholders.electionTerm,
  );
  const amendmentNotice = fill(
    values.amendmentNotice,
    placeholders.amendmentNotice,
  );
  const fiscalYearEnd = fill(
    values.fiscalYearEnd,
    placeholders.fiscalYearEnd,
  );

  return template
    .replaceAll("{localName}", localName)
    .replaceAll("{vicePresidents}", vicePresidents)
    .replaceAll("{stewards}", stewards)
    .replaceAll("{gmmQuorum}", gmmQuorum)
    .replaceAll("{lecQuorum}", lecQuorum)
    .replaceAll("{signingOfficers}", signingOfficers)
    .replaceAll("{trustees}", trustees)
    .replaceAll("{meetingFrequency}", meetingFrequency)
    .replaceAll("{electionTerm}", electionTerm)
    .replaceAll("{amendmentNotice}", amendmentNotice)
    .replaceAll("{fiscalYearEnd}", fiscalYearEnd);
}

/** Build a plain-text local bylaws draft from form values + localized article strings. */
export function buildBylawTemplate(
  values: BylawFormValues,
  labels: BylawTemplateLabels,
  options: BuildBylawTemplateOptions = {},
): string {
  const articleSet = options.articleSet ?? "standard";
  const baseArticles =
    articleSet === "opseu" && options.opseuArticles
      ? options.opseuArticles
      : labels.articles;
  const overrides = options.articleOverrides ?? {};

  return BYLAW_ARTICLE_KEYS.map((key) => {
    const override = overrides[key]?.trim();
    if (override) return override;
    return interpolateArticle(
      baseArticles[key],
      values,
      labels.placeholders,
    );
  }).join("\n\n");
}

export function buildBylawArticleMap(
  values: BylawFormValues,
  labels: BylawTemplateLabels,
  options: BuildBylawTemplateOptions = {},
): Record<BylawArticleKey, string> {
  const articleSet = options.articleSet ?? "standard";
  const baseArticles =
    articleSet === "opseu" && options.opseuArticles
      ? options.opseuArticles
      : labels.articles;
  const overrides = options.articleOverrides ?? {};
  const out = {} as Record<BylawArticleKey, string>;
  for (const key of BYLAW_ARTICLE_KEYS) {
    const override = overrides[key]?.trim();
    out[key] =
      override ??
      interpolateArticle(baseArticles[key], values, labels.placeholders);
  }
  return out;
}

export function bylawDownloadBasename(localName: string): string {
  const slug = localName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug ? `${slug}-bylaws-draft` : "local-bylaws-draft";
}

export function bylawDownloadFilename(localName: string): string {
  return `${bylawDownloadBasename(localName)}.txt`;
}

export function createEmptyBylawForm(): BylawFormValues {
  return {
    localName: "",
    vicePresidents: "1",
    stewards: "",
    gmmQuorum: "",
    lecQuorum: "",
    signingOfficers: "",
    trustees: "",
    meetingFrequency: "",
    electionTerm: "",
    amendmentNotice: "",
    fiscalYearEnd: "",
  };
}

export function createEmptyBylawDraft(): BylawDraft {
  return {
    ...createEmptyBylawForm(),
    mode: "template",
    articleSet: "standard",
    articleOverrides: {},
    committeeNotes: {},
    existingBylaws: "",
  };
}

export function isBylawFormValues(value: unknown): value is BylawFormValues {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const keys: (keyof BylawFormValues)[] = [
    "localName",
    "vicePresidents",
    "stewards",
    "gmmQuorum",
    "lecQuorum",
    "signingOfficers",
    "trustees",
    "meetingFrequency",
    "electionTerm",
    "amendmentNotice",
    "fiscalYearEnd",
  ];
  return keys.every((key) => typeof v[key] === "string");
}

function isArticleOverrides(value: unknown): value is BylawArticleOverrides {
  if (!value || typeof value !== "object") return true;
  return Object.values(value).every((entry) => typeof entry === "string");
}

export function isBylawDraft(value: unknown): value is BylawDraft {
  if (!isBylawFormValues(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.mode !== "template" && v.mode !== "committee") return false;
  if (v.articleSet !== "standard" && v.articleSet !== "opseu") return false;
  if (typeof v.existingBylaws !== "string") return false;
  if (!isArticleOverrides(v.articleOverrides)) return false;
  if (!isArticleOverrides(v.committeeNotes)) return false;
  return true;
}

export function defaultArticleSetForPreset(
  presetId: BylawPresetId,
): BylawArticleSet {
  return presetId === "campus" || presetId === "opseuCaat" || presetId === "small"
    ? "opseu"
    : "standard";
}

/** URL preset alias — campus → opseuCaat for OPSEU CAAT college locals. */
export function normalizeBylawPresetId(
  value: string | null,
): BylawPresetId | null {
  if (!value) return null;
  if (value === "campus") return "opseuCaat";
  return (BYLAW_PRESET_IDS as readonly string[]).includes(value)
    ? (value as BylawPresetId)
    : null;
}
