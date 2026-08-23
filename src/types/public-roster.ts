/**
 * On-device public officer/steward directory for Org Chart + Website Template.
 * Not the Hub officer roster (emails, terms, MFA) and not a membership list.
 */

export const PUBLIC_ROSTER_VERSION = "1.0" as const;

export const PUBLIC_ROSTER_GROUPS = [
  "executive",
  "stewards",
  "committee",
] as const;

export type PublicRosterGroup = (typeof PUBLIC_ROSTER_GROUPS)[number];

/** Optional FT/PT tag on the directory sheet (not a membership record). */
export const PUBLIC_ROSTER_UNITS = ["ft", "pt"] as const;

export type PublicRosterUnit = (typeof PUBLIC_ROSTER_UNITS)[number];

export interface PublicRosterPerson {
  id: string;
  name: string;
  role: string;
  location: string;
  group: PublicRosterGroup;
  /** Required when group is committee; ignored otherwise. */
  committeeName?: string;
  /** Id of another person on this roster; omit for top-level executive. */
  reportsToId?: string | null;
  /** When true, Website Template can copy this row onto the public site. */
  showOnWebsite: boolean;
  /** Optional unit tag shown as (FT) / (PT) on directory layouts. */
  unit?: PublicRosterUnit | null;
}

export interface PublicRoster {
  version: typeof PUBLIC_ROSTER_VERSION;
  updatedAt: string;
  people: PublicRosterPerson[];
}

/** Sanity cap so a pasted sheet cannot balloon the poster or ZIP. */
export const MAX_ROSTER_PEOPLE = 80;

/** Website officers grid stays a short contact strip. */
export const MAX_WEBSITE_OFFICERS = 24;
