import type { WebsiteOfficer } from "@/types/website-template";
import {
  MAX_WEBSITE_OFFICERS,
  type PublicRoster,
  type PublicRosterPerson,
} from "@/types/public-roster";

export function personToWebsiteOfficer(
  person: PublicRosterPerson,
): WebsiteOfficer {
  return {
    name: person.name.trim(),
    role: person.role.trim(),
    location: person.location.trim(),
  };
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
