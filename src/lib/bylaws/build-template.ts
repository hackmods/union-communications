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
  fiscalYearEnd: string;
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
    replace(labels.articles.amendments),
    replace(labels.articles.conflict),
  ].join("\n\n");
}

export function bylawDownloadFilename(localName: string): string {
  const slug = localName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug ? `${slug}-bylaws-draft.txt` : "local-bylaws-draft.txt";
}
