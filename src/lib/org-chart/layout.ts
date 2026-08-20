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
