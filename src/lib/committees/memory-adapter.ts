import type { CommitteesAdapter } from "./adapter";
import type {
  Committee,
  CommitteeListFilters,
  CreateCommitteeInput,
  UpdateCommitteeInput,
} from "@/types/committees";

const now = () => new Date().toISOString();

const committees: Committee[] = [
  {
    id: "com-001",
    unionId: "union-opseu",
    localId: "local-243",
    name: "Health & Safety",
    description: "Workplace health and safety representatives.",
    memberOfficerIds: ["off-002"],
    createdAt: "2025-01-15T12:00:00.000Z",
    updatedAt: "2025-01-15T12:00:00.000Z",
  },
  {
    id: "com-002",
    unionId: "union-opseu",
    localId: "local-243",
    name: "Social",
    description: "Member events and solidarity fundraising.",
    memberOfficerIds: ["off-001"],
    createdAt: "2025-02-01T12:00:00.000Z",
    updatedAt: "2025-02-01T12:00:00.000Z",
  },
];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortCommittees(list: Committee[]): Committee[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

export class MemoryCommitteesAdapter implements CommitteesAdapter {
  async list(filters: CommitteeListFilters): Promise<Committee[]> {
    let results = committees.filter((c) => c.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((c) => c.localId === filters.localId);
    }
    return sortCommittees(results);
  }

  async getById(committeeId: string): Promise<Committee | null> {
    return committees.find((c) => c.id === committeeId) ?? null;
  }

  async create(
    input: CreateCommitteeInput,
    meta: { unionId: string; localId: string },
  ): Promise<Committee> {
    const ts = now();
    const committee: Committee = {
      id: id("com"),
      unionId: meta.unionId,
      localId: meta.localId,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      memberOfficerIds: [...(input.memberOfficerIds ?? [])],
      createdAt: ts,
      updatedAt: ts,
    };
    committees.push(committee);
    return committee;
  }

  async update(
    committeeId: string,
    input: UpdateCommitteeInput,
  ): Promise<Committee | null> {
    const idx = committees.findIndex((c) => c.id === committeeId);
    if (idx < 0) return null;
    const existing = committees[idx];
    const next: Committee = { ...existing, updatedAt: now() };
    if (input.name !== undefined) next.name = input.name.trim();
    if (input.description !== undefined) {
      next.description =
        input.description === null || input.description.trim() === ""
          ? undefined
          : input.description.trim();
    }
    if (input.memberOfficerIds !== undefined) {
      next.memberOfficerIds = [...input.memberOfficerIds];
    }
    committees[idx] = next;
    return next;
  }

  async remove(committeeId: string): Promise<boolean> {
    const idx = committees.findIndex((c) => c.id === committeeId);
    if (idx < 0) return false;
    committees.splice(idx, 1);
    return true;
  }
}

export const memoryCommitteesStore: CommitteesAdapter =
  new MemoryCommitteesAdapter();
