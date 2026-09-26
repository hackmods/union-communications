import type { WebsiteOfficer } from "@/types/website-template";
import {
  MAX_WEBSITE_OFFICERS,
  type PublicRoster,
  type PublicRosterPerson,
} from "@/types/public-roster";

export function personToWebsiteOfficer(
  person: PublicRosterPerson,
): WebsiteOfficer {
  const officer: WebsiteOfficer = {
    name: person.name.trim(),
    role: person.role.trim(),
    location: person.location.trim(),
  };
  if (person.group) officer.group = person.group;
  if (person.committeeName?.trim()) {
    officer.committeeName = person.committeeName.trim();
  }
  if (person.unit) officer.unit = person.unit;
  return officer;
}

export function officersFromRoster(
  roster: PublicRoster,
  max = MAX_WEBSITE_OFFICERS,
): WebsiteOfficer[] {
  return roster.people
    .filter((person) => person.showOnWebsite && person.name.trim())
    .slice(0, max)
    .map(personToWebsiteOfficer);
}

export function partitionWebsiteOfficers(officers: WebsiteOfficer[]): {
  executive: WebsiteOfficer[];
  stewards: WebsiteOfficer[];
  committees: WebsiteOfficer[];
} {
  const executive: WebsiteOfficer[] = [];
  const stewards: WebsiteOfficer[] = [];
  const committees: WebsiteOfficer[] = [];
  for (const officer of officers) {
    if (!officer.name.trim()) continue;
    const group = officer.group ?? "executive";
    if (group === "stewards") stewards.push(officer);
    else if (group === "committee") committees.push(officer);
    else executive.push(officer);
  }
  // Legacy flat lists with no group metadata: treat all as executive.
  if (
    executive.length === 0 &&
    stewards.length === 0 &&
    committees.length === 0
  ) {
    return {
      executive: officers.filter((o) => o.name.trim()),
      stewards: [],
      committees: [],
    };
  }
  return { executive, stewards, committees };
}
