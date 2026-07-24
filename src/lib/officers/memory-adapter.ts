import type { OfficerRosterAdapter } from "./adapter";
import type {
  CreateOfficerRosterInput,
  OfficerRosterEntry,
  OfficerRosterListFilters,
  UpdateOfficerRosterInput,
} from "@/types/officer-roster";

const now = () => new Date().toISOString();

const entries: OfficerRosterEntry[] = [
  {
    id: "off-001",
    unionId: "union-opseu",
    localId: "local-243",
    name: "Alex Rivera",
    role: "President",
    termStart: "2024-07-01",
    termEnd: "2026-08-31",
    email: "president@local243.ca",
    committees: ["Executive"],
    createdAt: "2024-07-01T12:00:00.000Z",
    updatedAt: "2024-07-01T12:00:00.000Z",
  },
  {
    id: "off-002",
    unionId: "union-opseu",
    localId: "local-243",
    name: "Jordan Chen",
    role: "Vice-President",
    termStart: "2024-07-01",
    termEnd: "2027-06-30",
    email: "vp@local243.ca",
    committees: ["Executive", "Health & Safety"],
    createdAt: "2024-07-01T12:00:00.000Z",
    updatedAt: "2024-07-01T12:00:00.000Z",
  },
];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortEntries(list: OfficerRosterEntry[]): OfficerRosterEntry[] {
  return [...list].sort((a, b) => {
    const byRole = a.role.localeCompare(b.role);
    if (byRole !== 0) return byRole;
    return a.name.localeCompare(b.name);
  });
}

export class MemoryOfficerRosterAdapter implements OfficerRosterAdapter {
  async list(filters: OfficerRosterListFilters): Promise<OfficerRosterEntry[]> {
    let results = entries.filter((e) => e.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((e) => e.localId === filters.localId);
    }
    return sortEntries(results);
  }

  async getById(entryId: string): Promise<OfficerRosterEntry | null> {
    return entries.find((e) => e.id === entryId) ?? null;
  }

  async create(
    input: CreateOfficerRosterInput,
    meta: { unionId: string; localId: string },
  ): Promise<OfficerRosterEntry> {
    const ts = now();
    const entry: OfficerRosterEntry = {
      id: id("off"),
      unionId: meta.unionId,
      localId: meta.localId,
      name: input.name,
      role: input.role,
      termStart: input.termStart,
      ...(input.termEnd !== undefined ? { termEnd: input.termEnd } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.committees !== undefined
        ? { committees: [...input.committees] }
        : {}),
      createdAt: ts,
      updatedAt: ts,
    };
    entries.push(entry);
    return entry;
  }

  async update(
    entryId: string,
    input: UpdateOfficerRosterInput,
  ): Promise<OfficerRosterEntry | null> {
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx < 0) return null;
    const existing = entries[idx];
    const next: OfficerRosterEntry = { ...existing, updatedAt: now() };

    if (input.name !== undefined) next.name = input.name;
    if (input.role !== undefined) next.role = input.role;
    if (input.termStart !== undefined) next.termStart = input.termStart;
    if (input.termEnd === null) {
      delete next.termEnd;
    } else if (input.termEnd !== undefined) {
      next.termEnd = input.termEnd;
    }
    if (input.email === null) {
      delete next.email;
    } else if (input.email !== undefined) {
      next.email = input.email;
    }
    if (input.phone === null) {
      delete next.phone;
    } else if (input.phone !== undefined) {
      next.phone = input.phone;
    }
    if (input.committees === null) {
      delete next.committees;
    } else if (input.committees !== undefined) {
      next.committees = [...input.committees];
    }

    entries[idx] = next;
    return next;
  }

  async remove(entryId: string): Promise<boolean> {
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx < 0) return false;
    entries.splice(idx, 1);
    return true;
  }
}

export const memoryOfficerRosterStore: OfficerRosterAdapter =
  new MemoryOfficerRosterAdapter();
