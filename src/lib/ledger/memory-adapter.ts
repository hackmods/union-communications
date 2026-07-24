import type { LedgerAdapter } from "./adapter";
import type {
  CreateLedgerEntryInput,
  LedgerEntry,
  LedgerListFilters,
  UpdateLedgerEntryInput,
} from "@/types/ledger";

const entries: LedgerEntry[] = [
  {
    id: "led-001",
    unionId: "union-opseu",
    localId: "local-243",
    date: "2026-01-15",
    description: "Opening transfer from prior year social fund",
    amount: 500,
    type: "income",
    category: "transfer",
    recordedById: "user-president-243",
  },
  {
    id: "led-002",
    unionId: "union-opseu",
    localId: "local-243",
    date: "2026-03-10",
    description: "Membership raffle proceeds",
    amount: 175.5,
    type: "income",
    category: "fundraising",
    recordedById: "user-president-243",
  },
  {
    id: "led-003",
    unionId: "union-opseu",
    localId: "local-243",
    date: "2026-04-02",
    description: "Catering for solidarity lunch",
    amount: 120,
    type: "expense",
    category: "social",
    recordedById: "user-president-243",
  },
  {
    id: "led-004",
    unionId: "union-opseu",
    localId: "local-243",
    date: "2026-06-18",
    description: "Convention delegate per diem (advance)",
    amount: 200,
    type: "expense",
    category: "travel",
    recordedById: "user-president-243",
  },
];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortEntries(list: LedgerEntry[]): LedgerEntry[] {
  return [...list].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}

export class MemoryLedgerAdapter implements LedgerAdapter {
  async list(filters: LedgerListFilters): Promise<LedgerEntry[]> {
    let results = entries.filter((e) => e.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((e) => e.localId === filters.localId);
    }
    if (filters.type) {
      results = results.filter((e) => e.type === filters.type);
    }
    if (filters.category) {
      results = results.filter((e) => e.category === filters.category);
    }
    if (filters.from) {
      results = results.filter((e) => e.date >= filters.from!);
    }
    if (filters.to) {
      results = results.filter((e) => e.date <= filters.to!);
    }
    return sortEntries(results);
  }

  async getById(entryId: string): Promise<LedgerEntry | null> {
    return entries.find((e) => e.id === entryId) ?? null;
  }

  async create(
    input: CreateLedgerEntryInput,
    meta: {
      unionId: string;
      localId: string;
      recordedById: string;
    },
  ): Promise<LedgerEntry> {
    const entry: LedgerEntry = {
      id: id("led"),
      unionId: meta.unionId,
      localId: meta.localId,
      date: input.date,
      description: input.description,
      amount: Math.abs(input.amount),
      type: input.type,
      category: input.category,
      recordedById: meta.recordedById,
    };
    entries.push(entry);
    return entry;
  }

  async update(
    entryId: string,
    input: UpdateLedgerEntryInput,
  ): Promise<LedgerEntry | null> {
    const idx = entries.findIndex((e) => e.id === entryId);
    if (idx < 0) return null;
    const existing = entries[idx];
    const next: LedgerEntry = { ...existing };
    if (input.date !== undefined) next.date = input.date;
    if (input.description !== undefined) next.description = input.description;
    if (input.amount !== undefined) next.amount = Math.abs(input.amount);
    if (input.type !== undefined) next.type = input.type;
    if (input.category !== undefined) next.category = input.category;
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

export const memoryLedgerStore: LedgerAdapter = new MemoryLedgerAdapter();
