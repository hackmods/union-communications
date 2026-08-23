import type { PublicRosterPerson } from "@/types/public-roster";

export type OrgChartBandKind =
  | "executive-lead"
  | "executive"
  | "stewards"
  | "committee";

export interface OrgChartBand {
  kind: OrgChartBandKind;
  /** Location or committee heading; omitted for the exec lead. */
  title?: string;
  people: PublicRosterPerson[];
}

function named(people: PublicRosterPerson[]): PublicRosterPerson[] {
  return people.filter((person) => person.name.trim() || person.role.trim());
}

function isPresidentRole(role: string): boolean {
  return /president/i.test(role) && !/vice/i.test(role);
}

function pickExecutiveLead(
  executive: PublicRosterPerson[],
): PublicRosterPerson | undefined {
  const reported = new Set(
    executive.map((person) => person.reportsToId).filter(Boolean),
  );
  const byReport = executive.find((person) => reported.has(person.id));
  if (byReport) return byReport;
  return executive.find((person) => isPresidentRole(person.role));
}

function groupBy(
  people: PublicRosterPerson[],
  key: (person: PublicRosterPerson) => string,
): Map<string, PublicRosterPerson[]> {
  const map = new Map<string, PublicRosterPerson[]>();
  for (const person of people) {
    const label = key(person);
    const list = map.get(label) ?? [];
    list.push(person);
    map.set(label, list);
  }
  return map;
}

/**
 * Poster bands: president (or reports-to root) on top, remaining executive,
 * then stewards by location, then committees by name.
 */
export function groupOrgChartPeople(
  people: PublicRosterPerson[],
): OrgChartBand[] {
  const visible = named(people);
  const bands: OrgChartBand[] = [];

  const executive = visible.filter((person) => person.group === "executive");
  const lead = pickExecutiveLead(executive);
  const rest = lead
    ? executive.filter((person) => person.id !== lead.id)
    : executive;
  if (lead) {
    bands.push({ kind: "executive-lead", people: [lead] });
  }
  if (rest.length) {
    bands.push({ kind: "executive", people: rest });
  }

  const stewards = visible.filter((person) => person.group === "stewards");
  for (const [title, group] of groupBy(
    stewards,
    (person) => person.location.trim(),
  )) {
    bands.push({
      kind: "stewards",
      title: title || undefined,
      people: group,
    });
  }

  const committees = visible.filter((person) => person.group === "committee");
  for (const [title, group] of groupBy(
    committees,
    (person) => person.committeeName?.trim() || person.location.trim(),
  )) {
    bands.push({
      kind: "committee",
      title: title || undefined,
      people: group,
    });
  }

  return bands;
}

export function rosterHasNamedPeople(people: PublicRosterPerson[]): boolean {
  return named(people).length > 0;
}

export type OrgChartDirectoryRow = {
  personId: string;
  /** Position cell; blank for steward continuation rows. */
  position: string;
  name: string;
  location: string;
};

export function formatRosterUnitTag(
  unit: PublicRosterPerson["unit"],
): string {
  if (unit === "ft") return " (FT)";
  if (unit === "pt") return " (PT)";
  return "";
}

/**
 * Flat directory rows for the Local-243-style Position | Name | Location sheet.
 * Stewards share one position label, then blank continuation cells.
 */
export function directoryRowsFromPeople(
  people: PublicRosterPerson[],
  stewardsPositionLabel: string,
): OrgChartDirectoryRow[] {
  const visible = named(people);
  const rows: OrgChartDirectoryRow[] = [];

  const pushPerson = (person: PublicRosterPerson, position: string) => {
    const name = `${person.name.trim() || person.role.trim()}${formatRosterUnitTag(person.unit)}`;
    rows.push({
      personId: person.id,
      position,
      name,
      location: person.location.trim(),
    });
  };

  for (const person of visible.filter((row) => row.group === "executive")) {
    pushPerson(person, person.role.trim());
  }

  const stewards = visible.filter((row) => row.group === "stewards");
  stewards.forEach((person, index) => {
    pushPerson(person, index === 0 ? stewardsPositionLabel : "");
  });

  for (const person of visible.filter((row) => row.group === "committee")) {
    const position =
      person.role.trim() ||
      person.committeeName?.trim() ||
      "";
    pushPerson(person, position);
  }

  return rows;
}
