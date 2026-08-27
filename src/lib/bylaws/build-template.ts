/**
 * Local bylaw boilerplate for the public Bylaw Builder.
 * All generation stays on-device; this helper only interpolates form values.
 */

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

export type BylawPresetId = "small" | "campus" | "large";

export const BYLAW_PRESET_IDS: readonly BylawPresetId[] = [
  "small",
  "campus",
  "large",
] as const;

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
  campus: {
    localName: "OPSEU / SEFPO Local 243",
    vicePresidents: "2",
    stewards: "One steward per campus unit, plus one Chief Steward",
    gmmQuorum: "25 members or 10% of the membership, whichever is less",
    lecQuorum: "50% of the Local Executive Committee",
    signingOfficers: "President and Treasurer, or either with one Vice-President",
    trustees: "Three elected trustees who are not signing officers",
    meetingFrequency: "Monthly during the academic year, plus special meetings as needed",
    electionTerm: "Two years, staggered where practicable",
    amendmentNotice: "21 days written notice posted on union boards and emailed to members",
    fiscalYearEnd: "March 31",
  },
  large: {
    localName: "Local Union 1000",
    vicePresidents: "3",
    stewards: "One steward per 50 members, elected by unit",
    gmmQuorum: "50 members or 5% of the membership, whichever is less",
    lecQuorum: "A majority of LEC officers including the President or designate",
    signingOfficers: "Any two of President, Secretary-Treasurer, and First Vice-President",
    trustees: "Three elected trustees with annual audit duties",
    meetingFrequency: "At least six General Membership Meetings per year",
    electionTerm: "Three years",
    amendmentNotice: "30 days written notice to every member",
    fiscalYearEnd: "December 31",
  },
};

export type BylawTemplateLabels = {
  placeholders: BylawFormValues;
  articles: {
    name: string;
    purpose: string;
    membership: string;
    executive: string;
    stewards: string;
    quorum: string;
    meetings: string;
    elections: string;
    finances: string;
    trustees: string;
    committees: string;
    amendments: string;
    conflict: string;
  };
};

function fill(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/** Build a plain-text local bylaws draft from form values + localized article strings. */
export function buildBylawTemplate(
  values: BylawFormValues,
  labels: BylawTemplateLabels,
): string {
  const localName = fill(values.localName, labels.placeholders.localName);
  const vicePresidents = fill(
    values.vicePresidents,
    labels.placeholders.vicePresidents,
  );
  const stewards = fill(values.stewards, labels.placeholders.stewards);
  const gmmQuorum = fill(values.gmmQuorum, labels.placeholders.gmmQuorum);
  const lecQuorum = fill(values.lecQuorum, labels.placeholders.lecQuorum);
  const signingOfficers = fill(
    values.signingOfficers,
    labels.placeholders.signingOfficers,
  );
  const trustees = fill(values.trustees, labels.placeholders.trustees);
  const meetingFrequency = fill(
    values.meetingFrequency,
    labels.placeholders.meetingFrequency,
  );
  const electionTerm = fill(
    values.electionTerm,
    labels.placeholders.electionTerm,
  );
  const amendmentNotice = fill(
    values.amendmentNotice,
    labels.placeholders.amendmentNotice,
  );
  const fiscalYearEnd = fill(
    values.fiscalYearEnd,
    labels.placeholders.fiscalYearEnd,
  );

  const replace = (template: string) =>
    template
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

  return [
    replace(labels.articles.name),
    replace(labels.articles.purpose),
    replace(labels.articles.membership),
    replace(labels.articles.executive),
    replace(labels.articles.stewards),
    replace(labels.articles.quorum),
    replace(labels.articles.meetings),
    replace(labels.articles.elections),
    replace(labels.articles.finances),
    replace(labels.articles.trustees),
    replace(labels.articles.committees),
    replace(labels.articles.amendments),
    replace(labels.articles.conflict),
  ].join("\n\n");
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
