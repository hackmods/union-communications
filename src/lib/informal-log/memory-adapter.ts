import type { InformalLogAdapter } from "./adapter";
import type {
  CreateInformalLogInput,
  InformalLogEntry,
  InformalLogListFilters,
  UpdateInformalLogInput,
} from "@/types/informal-log";

const entries: InformalLogEntry[] = [
  {
    id: "ilog-001",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    memberPseudonym: "Member A",
    topic: "Scheduling / overtime assignment",
    channel: "in_person",
    summary:
      "Discussed with supervisor whether OT was offered by seniority. Supervisor said they would check and follow up next week.",
    occurredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    loggedById: "user-steward-243",
    loggedByName: "Local 243 Steward",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ilog-002",
    unionId: "union-opseu",
    localId: "local-243",
    memberPseudonym: "Member B",
    topic: "Workplace accommodation follow-up",
    channel: "email",
    summary:
      "Member emailed about delayed response on accommodation request. Steward confirmed receipt with HR and asked for timeline.",
    occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    loggedById: "user-steward-243",
    loggedByName: "Local 243 Steward",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class MemoryInformalLogAdapter implements InformalLogAdapter {
  async list(filters: InformalLogListFilters): Promise<InformalLogEntry[]> {
    let results = entries.filter((e) => e.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((e) => e.localId === filters.localId);
    }
    if (filters.bargainingUnitId) {
      results = results.filter(
        (e) =>
          !e.bargainingUnitId ||
          e.bargainingUnitId === filters.bargainingUnitId,
      );
    }
    if (filters.unconvertedOnly) {
      results = results.filter((e) => !e.convertedToGrievanceId);
    }
    return results.sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
  }

  async getById(entryId: string): Promise<InformalLogEntry | null> {
    return entries.find((e) => e.id === entryId) ?? null;
  }

  async create(
    input: CreateInformalLogInput,
    meta: {
      unionId: string;
      localId: string;
      bargainingUnitId?: string;
      loggedById: string;
      loggedByName: string;
    },
  ): Promise<InformalLogEntry> {
    const entry: InformalLogEntry = {
      id: id("ilog"),
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: input.bargainingUnitId ?? meta.bargainingUnitId,
      memberPseudonym: input.memberPseudonym,
      topic: input.topic,
      channel: input.channel,
      summary: input.summary,
      occurredAt: input.occurredAt,
      loggedById: meta.loggedById,
      loggedByName: meta.loggedByName,
      createdAt: new Date().toISOString(),
    };
    entries.push(entry);
    return entry;
  }

  async update(
    entryId: string,
    input: UpdateInformalLogInput,
  ): Promise<InformalLogEntry | null> {
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx < 0) return null;
    const existing = entries[idx];
    const next: InformalLogEntry = { ...existing };
    if (input.memberPseudonym !== undefined) {
      next.memberPseudonym =
        input.memberPseudonym === null ? undefined : input.memberPseudonym;
    }
    if (input.topic !== undefined) next.topic = input.topic;
    if (input.channel !== undefined) next.channel = input.channel;
    if (input.summary !== undefined) next.summary = input.summary;
    if (input.occurredAt !== undefined) next.occurredAt = input.occurredAt;
    if (input.bargainingUnitId !== undefined) {
      next.bargainingUnitId =
        input.bargainingUnitId === null ? undefined : input.bargainingUnitId;
    }
    if (input.convertedToGrievanceId !== undefined) {
      next.convertedToGrievanceId =
        input.convertedToGrievanceId === null
          ? undefined
          : input.convertedToGrievanceId;
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

export const memoryInformalLogStore: InformalLogAdapter =
  new MemoryInformalLogAdapter();
