import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { officerRoster } from "@/lib/db/schema";
import type { OfficerRosterAdapter } from "./adapter";
import type {
  CreateOfficerRosterInput,
  OfficerRosterEntry,
  OfficerRosterListFilters,
  UpdateOfficerRosterInput,
} from "@/types/officer-roster";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapEntry(row: typeof officerRoster.$inferSelect): OfficerRosterEntry {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    name: row.name,
    role: row.role,
    termStart: row.termStart,
    ...(row.termEnd ? { termEnd: row.termEnd } : {}),
    ...(row.email ? { email: row.email } : {}),
    ...(row.phone ? { phone: row.phone } : {}),
    ...(row.committees && row.committees.length > 0
      ? { committees: row.committees }
      : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function sortEntries(list: OfficerRosterEntry[]): OfficerRosterEntry[] {
  return [...list].sort((a, b) => {
    const byRole = a.role.localeCompare(b.role);
    if (byRole !== 0) return byRole;
    return a.name.localeCompare(b.name);
  });
}

export class DrizzleOfficerRosterAdapter implements OfficerRosterAdapter {
  async list(filters: OfficerRosterListFilters): Promise<OfficerRosterEntry[]> {
    const db = getDb();
    const conditions = [eq(officerRoster.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(officerRoster.localId, filters.localId));
    }
    const rows = await db
      .select()
      .from(officerRoster)
      .where(and(...conditions));
    return sortEntries(rows.map(mapEntry));
  }

  async getById(id: string): Promise<OfficerRosterEntry | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(officerRoster)
      .where(eq(officerRoster.id, id))
      .limit(1);
    return rows[0] ? mapEntry(rows[0]) : null;
  }

  async create(
    input: CreateOfficerRosterInput,
    meta: { unionId: string; localId: string },
  ): Promise<OfficerRosterEntry> {
    const db = getDb();
    const id = newId("off");
    const ts = new Date();
    await db.insert(officerRoster).values({
      id,
      unionId: meta.unionId,
      localId: meta.localId,
      name: input.name,
      role: input.role,
      termStart: input.termStart,
      termEnd: input.termEnd ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      committees: input.committees ?? null,
      createdAt: ts,
      updatedAt: ts,
    });
    const created = await this.getById(id);
    if (!created) throw new Error("Failed to create officer roster entry");
    return created;
  }

  async update(
    id: string,
    input: UpdateOfficerRosterInput,
  ): Promise<OfficerRosterEntry | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const patch: Partial<typeof officerRoster.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) patch.name = input.name;
    if (input.role !== undefined) patch.role = input.role;
    if (input.termStart !== undefined) patch.termStart = input.termStart;
    if (input.termEnd !== undefined) patch.termEnd = input.termEnd;
    if (input.email !== undefined) patch.email = input.email;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.committees !== undefined) patch.committees = input.committees;

    const db = getDb();
    await db.update(officerRoster).set(patch).where(eq(officerRoster.id, id));
    return this.getById(id);
  }

  async remove(id: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db
      .delete(officerRoster)
      .where(eq(officerRoster.id, id))
      .returning({ id: officerRoster.id });
    return deleted.length > 0;
  }
}
