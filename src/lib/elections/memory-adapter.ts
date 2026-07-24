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

const now = () => new Date().toISOString();

const cycles: ElectionCycle[] = [
  {
    id: "elec-001",
    unionId: "union-opseu",
    localId: "local-243",
    title: "2026 Executive election",
    positions: ["President", "Vice-President", "Secretary"],
    status: "open",
    nominations: [
      {
        id: "nom-001",
        position: "President",
        nomineeName: "Alex Rivera",
        status: "accepted",
        nominator: "Jordan Chen",
      },
      {
        id: "nom-002",
        position: "Vice-President",
        nomineeName: "Sam Okonkwo",
        status: "pending",
        nominator: "Alex Rivera",
      },
    ],
    tallies: [],
    termStart: "2026-09-01",
    createdAt: "2026-06-01T12:00:00.000Z",
    updatedAt: "2026-06-15T12:00:00.000Z",
  },
];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortCycles(list: ElectionCycle[]): ElectionCycle[] {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function findIdx(cycleId: string): number {
  return cycles.findIndex((c) => c.id === cycleId);
}

export class MemoryElectionsAdapter implements ElectionsAdapter {
  async list(filters: ElectionListFilters): Promise<ElectionCycle[]> {
    let results = cycles.filter((c) => c.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((c) => c.localId === filters.localId);
    }
    if (filters.status) {
      results = results.filter((c) => c.status === filters.status);
    }
    return sortCycles(results);
  }

  async getById(cycleId: string): Promise<ElectionCycle | null> {
    return cycles.find((c) => c.id === cycleId) ?? null;
  }

  async create(
    input: CreateElectionCycleInput,
    meta: { unionId: string; localId: string },
  ): Promise<ElectionCycle> {
    const ts = now();
    const cycle: ElectionCycle = {
      id: id("elec"),
      unionId: meta.unionId,
      localId: meta.localId,
      title: input.title.trim(),
      positions: input.positions.map((p) => p.trim()).filter(Boolean),
      status: "open",
      nominations: [],
      tallies: [],
      termStart: input.termStart?.trim() || undefined,
      createdAt: ts,
      updatedAt: ts,
    };
    cycles.push(cycle);
    return cycle;
  }

  async update(
    cycleId: string,
    input: UpdateElectionCycleInput,
  ): Promise<ElectionCycle | null> {
    const idx = findIdx(cycleId);
    if (idx < 0) return null;
    const existing = cycles[idx];
    const next: ElectionCycle = { ...existing, updatedAt: now() };
    if (input.title !== undefined) next.title = input.title.trim();
    if (input.positions !== undefined) {
      next.positions = input.positions.map((p) => p.trim()).filter(Boolean);
    }
    if (input.status !== undefined) next.status = input.status;
    if (input.termStart !== undefined) {
      next.termStart =
        input.termStart === null || input.termStart.trim() === ""
          ? undefined
          : input.termStart.trim();
    }
    cycles[idx] = next;
    return next;
  }

  async remove(cycleId: string): Promise<boolean> {
    const idx = findIdx(cycleId);
    if (idx < 0) return false;
    cycles.splice(idx, 1);
    return true;
  }

  async addNomination(
    cycleId: string,
    input: CreateNominationInput,
  ): Promise<ElectionCycle | null> {
    const idx = findIdx(cycleId);
    if (idx < 0) return null;
    const existing = cycles[idx];
    const nomination: Nomination = {
      id: id("nom"),
      position: input.position.trim(),
      nomineeName: input.nomineeName.trim(),
      status: input.status ?? "pending",
      nominator: input.nominator?.trim() || undefined,
    };
    const next: ElectionCycle = {
      ...existing,
      nominations: [...existing.nominations, nomination],
      updatedAt: now(),
    };
    cycles[idx] = next;
    return next;
  }

  async updateNomination(
    cycleId: string,
    nominationId: string,
    input: UpdateNominationInput,
  ): Promise<ElectionCycle | null> {
    const idx = findIdx(cycleId);
    if (idx < 0) return null;
    const existing = cycles[idx];
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
    const next: ElectionCycle = {
      ...existing,
      nominations,
      updatedAt: now(),
    };
    cycles[idx] = next;
    return next;
  }

  async removeNomination(
    cycleId: string,
    nominationId: string,
  ): Promise<ElectionCycle | null> {
    const idx = findIdx(cycleId);
    if (idx < 0) return null;
    const existing = cycles[idx];
    const nominations = existing.nominations.filter(
      (n) => n.id !== nominationId,
    );
    if (nominations.length === existing.nominations.length) return null;
    const next: ElectionCycle = {
      ...existing,
      nominations,
      updatedAt: now(),
    };
    cycles[idx] = next;
    return next;
  }

  async recordTallies(
    cycleId: string,
    input: RecordTalliesInput,
  ): Promise<ElectionCycle | null> {
    const idx = findIdx(cycleId);
    if (idx < 0) return null;
    const existing = cycles[idx];
    const markTallied = input.markTallied !== false;
    const next: ElectionCycle = {
      ...existing,
      tallies: input.tallies.map((t) => ({
        position: t.position.trim(),
        nomineeName: t.nomineeName.trim(),
        votes: Math.max(0, Math.floor(t.votes)),
      })),
      status: markTallied ? "tallied" : existing.status,
      updatedAt: now(),
    };
    cycles[idx] = next;
    return next;
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

export const memoryElectionsStore: ElectionsAdapter =
  new MemoryElectionsAdapter();
