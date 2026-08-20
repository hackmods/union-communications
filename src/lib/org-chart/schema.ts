import { z } from "zod";
import {
  MAX_ROSTER_PEOPLE,
  PUBLIC_ROSTER_GROUPS,
  PUBLIC_ROSTER_VERSION,
  type PublicRoster,
  type PublicRosterPerson,
} from "@/types/public-roster";
import { defaultPublicRoster } from "./defaults";

const personSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().max(200),
  role: z.string().max(120),
  location: z.string().max(200).optional().default(""),
  group: z.enum(PUBLIC_ROSTER_GROUPS),
  committeeName: z.string().max(120).optional(),
  reportsToId: z.string().max(80).nullable().optional(),
  showOnWebsite: z.boolean(),
});

const rosterSchema = z.object({
  version: z.literal(PUBLIC_ROSTER_VERSION),
  updatedAt: z.string().optional(),
  people: z.array(personSchema).max(MAX_ROSTER_PEOPLE),
});

export type RosterImportCode =
  | "brandKit"
  | "invalidJson"
  | "invalidSchema"
  | "empty"
  | "invalidCsv";

export type RosterImportResult =
  | { ok: true; roster: PublicRoster }
  | { ok: false; code: RosterImportCode };

function looksLikeBrandKit(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  if (Array.isArray(rec.people)) return false;
  if (rec.local && typeof rec.local === "object") return true;
  return rec.version === "1.1" || rec.version === "2.0";
}

function normalizePerson(raw: z.infer<typeof personSchema>): PublicRosterPerson {
  const committeeName = raw.committeeName?.trim();
  const reportsToId = raw.reportsToId?.trim() || null;
  const person: PublicRosterPerson = {
    id: raw.id,
    name: raw.name,
    role: raw.role,
    location: raw.location ?? "",
    group: raw.group,
    showOnWebsite: raw.showOnWebsite,
  };
  if (committeeName) person.committeeName = committeeName;
  if (reportsToId) person.reportsToId = reportsToId;
  return person;
}

export function parsePublicRosterJson(raw: unknown): RosterImportResult {
  if (looksLikeBrandKit(raw)) {
    return { ok: false, code: "brandKit" };
  }

  const parsed = rosterSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: "invalidSchema" };
  }
  if (parsed.data.people.length === 0) {
    return { ok: false, code: "empty" };
  }

  return {
    ok: true,
    roster: {
      version: PUBLIC_ROSTER_VERSION,
      updatedAt: parsed.data.updatedAt ?? new Date().toISOString(),
      people: parsed.data.people.map(normalizePerson),
    },
  };
}

export function parsePublicRosterJsonText(text: string): RosterImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, code: "invalidJson" };
  }
  return parsePublicRosterJson(raw);
}

export function serializePublicRoster(roster: PublicRoster): string {
  return JSON.stringify(
    {
      version: PUBLIC_ROSTER_VERSION,
      updatedAt: roster.updatedAt,
      people: roster.people,
    },
    null,
    2,
  );
}

export function stampRoster(people: PublicRosterPerson[]): PublicRoster {
  return {
    version: PUBLIC_ROSTER_VERSION,
    updatedAt: new Date().toISOString(),
    people,
  };
}

export function coercePublicRoster(raw: unknown): PublicRoster {
  const parsed = parsePublicRosterJson(raw);
  if (parsed.ok) return parsed.roster;
  return defaultPublicRoster();
}
