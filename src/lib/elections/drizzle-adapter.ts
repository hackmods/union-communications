import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { electionCycles } from "@/lib/db/schema";
import type { ElectionsAdapter } from "./adapter";
import type {
  CreateElectionCycleInput,
  CreateNominationInput,
  ElectionCycle,
  ElectionListFilters,
  Nomination,
  PromoteToRosterInput,
  RecordTalliesInput,
  UpdateElectionCycleInput,
  UpdateNominationInput,
} from "@/types/elections";
import type { OfficerRosterEntry } from "@/types/officer-roster";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapRow(row: typeof electionCycles.$inferSelect): ElectionCycle {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    title: row.title,
    positions: row.positions ?? [],
    status: row.status,
    nominations: row.nominations ?? [],
    tallies: row.tallies ?? [],
    termStart: row.termStart ?? undefined,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

export class DrizzleElectionsAdapter implements ElectionsAdapter {
  async list(filters: ElectionListFilters): Promise<ElectionCycle[]> {
    const db = getDb();
    const conditions = [eq(electionCycles.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(electionCycles.localId, filters.localId));
    }
    if (filters.status) {
      conditions.push(eq(electionCycles.status, filters.status));
    }
    const rows = await db
      .select()
      .from(electionCycles)
      .where(and(...conditions));
    return rows
      .map(mapRow)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getById(id: string): Promise<ElectionCycle | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(electionCycles)
      .where(eq(electionCycles.id, id))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(
    input: CreateElectionCycleInput,
    meta: { unionId: string; localId: string },
  ): Promise<ElectionCycle> {
    const db = getDb();
    const id = newId("elec");
    const ts = new Date();
    await db.insert(electionCycles).values({
      id,
      unionId: meta.unionId,
      localId: meta.localId,
      title: input.title.trim(),
      positions: input.positions.map((p) => p.trim()).filter(Boolean),
      status: "open",
      nominations: [],
      tallies: [],
      termStart: input.termStart?.trim() || null,
      createdAt: ts,
      updatedAt: ts,
    });
    const created = await this.getById(id);
    if (!created) throw new Error("Failed to create election cycle");
    return created;
  }

  async update(
    id: string,
    input: UpdateElectionCycleInput,
  ): Promise<ElectionCycle | null> {
    const existing = await this.getById(id);
    if (!existing) return null;
    const db = getDb();
    const patch: Partial<typeof electionCycles.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.positions !== undefined) {
      patch.positions = input.positions.map((p) => p.trim()).filter(Boolean);
    }
    if (input.status !== undefined) patch.status = input.status;
    if (input.termStart !== undefined) {
      patch.termStart =
        input.termStart === null || input.termStart.trim() === ""
          ? null
          : input.termStart.trim();
    }
    await db.update(electionCycles).set(patch).where(eq(electionCycles.id, id));
    return this.getById(id);
  }

  async remove(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .delete(electionCycles)
      .where(eq(electionCycles.id, id))
      .returning({ id: electionCycles.id });
    return result.length > 0;
  }

  async addNomination(
    cycleId: string,
    input: CreateNominationInput,
  ): Promise<ElectionCycle | null> {
    const existing = await this.getById(cycleId);
    if (!existing) return null;
    const nomination: Nomination = {
      id: newId("nom"),
      position: input.position.trim(),
      nomineeName: input.nomineeName.trim(),
      status: input.status ?? "pending",
      nominator: input.nominator?.trim() || undefined,
    };
    const db = getDb();
    await db
      .update(electionCycles)
      .set({
        nominations: [...existing.nominations, nomination],
        updatedAt: new Date(),
      })
      .where(eq(electionCycles.id, cycleId));
    return this.getById(cycleId);
  }

  async updateNomination(
    cycleId: string,
    nominationId: string,
    input: UpdateNominationInput,
  ): Promise<ElectionCycle | null> {
    const existing = await this.getById(cycleId);
    if (!existing) return null;
    const nomIdx = existing.nominations.findIndex((n) => n.id === nominationId);
    if (nomIdx < 0) return null;
    const nom = existing.nominations[nomIdx];
    const updated: Nomination = { ...nom };
    if (input.position !== undefined) updated.position = input.position.trim();
    if (input.nomineeName !== undefined) {
      updated.nomineeName = input.nomineeName.trim();
    }
    if (input.status !== undefined) updated.status = input.status;
    if (input.nominator !== undefined) {
      updated.nominator =
        input.nominator === null || input.nominator.trim() === ""
          ? undefined
          : input.nominator.trim();
    }
    const nominations = [...existing.nominations];
    nominations[nomIdx] = updated;
    const db = getDb();
    await db
      .update(electionCycles)
      .set({ nominations, updatedAt: new Date() })
      .where(eq(electionCycles.id, cycleId));
    return this.getById(cycleId);
  }

  async removeNomination(
    cycleId: string,
    nominationId: string,
  ): Promise<ElectionCycle | null> {
    const existing = await this.getById(cycleId);
    if (!existing) return null;
    const nominations = existing.nominations.filter(
      (n) => n.id !== nominationId,
    );
    if (nominations.length === existing.nominations.length) return null;
    const db = getDb();
    await db
      .update(electionCycles)
      .set({ nominations, updatedAt: new Date() })
      .where(eq(electionCycles.id, cycleId));
    return this.getById(cycleId);
  }

  async recordTallies(
    cycleId: string,
    input: RecordTalliesInput,
  ): Promise<ElectionCycle | null> {
    const existing = await this.getById(cycleId);
    if (!existing) return null;
    const markTallied = input.markTallied !== false;
    const db = getDb();
    await db
      .update(electionCycles)
      .set({
        tallies: input.tallies.map((t) => ({
          position: t.position.trim(),
          nomineeName: t.nomineeName.trim(),
          votes: Math.max(0, Math.floor(t.votes)),
        })),
        status: markTallied ? "tallied" : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(electionCycles.id, cycleId));
    return this.getById(cycleId);
  }

  async promoteToRoster(
    cycleId: string,
    input: PromoteToRosterInput,
    createOfficer: (
      officerInput: {
        name: string;
        role: string;
        termStart: string;
        termEnd?: string;
      },
      meta: { unionId: string; localId: string },
    ) => Promise<OfficerRosterEntry>,
  ): Promise<{ cycle: ElectionCycle; officer: OfficerRosterEntry } | null> {
    const cycle = await this.getById(cycleId);
    if (!cycle) return null;
    const termStart =
      input.termStart?.trim() ||
      cycle.termStart ||
      new Date().toISOString().slice(0, 10);
    const officer = await createOfficer(
      {
        name: input.nomineeName.trim(),
        role: (input.role ?? input.position).trim(),
        termStart,
        termEnd: input.termEnd?.trim() || undefined,
      },
      { unionId: cycle.unionId, localId: cycle.localId },
    );
    return { cycle, officer };
  }
}
