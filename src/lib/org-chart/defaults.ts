import { DEFAULT_WEBSITE_OFFICERS } from "@/types/website-template";
import type { PublicRoster, PublicRosterPerson } from "@/types/public-roster";
import { PUBLIC_ROSTER_VERSION } from "@/types/public-roster";

const SEED_IDS = [
  "exec-president",
  "exec-vp",
  "exec-secretary",
  "exec-treasurer",
] as const;

export function newRosterPersonId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `person-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyRosterPerson(
  group: PublicRosterPerson["group"] = "executive",
): PublicRosterPerson {
  return {
    id: newRosterPersonId(),
    name: "",
    role: "",
    location: "",
    group,
    showOnWebsite: group === "executive",
  };
}

export function defaultPublicRoster(
  updatedAt = "1970-01-01T00:00:00.000Z",
): PublicRoster {
  const people: PublicRosterPerson[] = DEFAULT_WEBSITE_OFFICERS.map(
    (officer, index) => {
      const id = SEED_IDS[index] ?? `exec-${index}`;
      const isPresident = /president/i.test(officer.role) && !/vice/i.test(officer.role);
      return {
        id,
        name: officer.name,
        role: officer.role,
        location: officer.location,
        group: "executive",
        reportsToId: isPresident ? null : "exec-president",
        showOnWebsite: true,
      };
    },
  );
  people.push({
    id: "steward-1",
    name: "",
    role: "",
    location: "",
    group: "stewards",
    showOnWebsite: false,
  });

  return {
    version: PUBLIC_ROSTER_VERSION,
    updatedAt,
    people,
  };
}
