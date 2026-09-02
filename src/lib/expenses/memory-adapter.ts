import type { ExpenseAdapter } from "./adapter";
import type {
  CreateExpenseSubmissionInput,
  ExpenseLineItem,
  ExpenseListFilters,
  ExpenseSubmission,
  UpdateExpenseSubmissionInput,
} from "@/types/expenses";
import { roundMoney, sumLineItems } from "./totals";

const submissions: ExpenseSubmission[] = [];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function withLineIds(
  items: Omit<ExpenseLineItem, "id">[],
): ExpenseLineItem[] {
  return items.map((item) => ({
    ...item,
    id: id("eli"),
    amount: Math.abs(item.amount),
  }));
}

export class MemoryExpenseAdapter implements ExpenseAdapter {
  async list(filters: ExpenseListFilters): Promise<ExpenseSubmission[]> {
    let results = submissions.filter((s) => s.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((s) => s.localId === filters.localId);
    }
    if (filters.status) {
      results = results.filter((s) => s.status === filters.status);
    }
    if (filters.submittedById) {
      results = results.filter(
        (s) => s.submittedById === filters.submittedById,
      );
    }
    return [...results].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async getById(submissionId: string): Promise<ExpenseSubmission | null> {
    return submissions.find((s) => s.id === submissionId) ?? null;
  }

  async create(
    input: CreateExpenseSubmissionInput,
    meta: {
      unionId: string;
      localId: string;
      submittedById: string;
      submittedByName: string;
    },
  ): Promise<ExpenseSubmission> {
    const lineItems = withLineIds(input.lineItems);
    const ts = now();
    const row: ExpenseSubmission = {
      id: id("es"),
      unionId: meta.unionId,
      localId: meta.localId,
      submittedById: meta.submittedById,
      submittedByName: meta.submittedByName,
      title: input.title,
      purpose: input.purpose,
      status: "draft",
      lineItems,
      totalAmount: roundMoney(sumLineItems(lineItems)),
      createdAt: ts,
      updatedAt: ts,
    };
    submissions.push(row);
    return row;
  }

  async update(
    submissionId: string,
    input: UpdateExpenseSubmissionInput,
  ): Promise<ExpenseSubmission | null> {
    const idx = submissions.findIndex((s) => s.id === submissionId);
    if (idx < 0) return null;
    const existing = submissions[idx];
    if (existing.status !== "draft") return null;

    const lineItems =
      input.lineItems !== undefined
        ? withLineIds(input.lineItems)
        : existing.lineItems;

    const next: ExpenseSubmission = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
      lineItems,
      totalAmount: roundMoney(sumLineItems(lineItems)),
      ...(input.status === "submitted" ? { status: "submitted" as const } : {}),
      updatedAt: now(),
    };
    submissions[idx] = next;
    return next;
  }

  async submit(submissionId: string): Promise<ExpenseSubmission | null> {
    const idx = submissions.findIndex((s) => s.id === submissionId);
    if (idx < 0) return null;
    const existing = submissions[idx];
    if (existing.status !== "draft") return null;
    const next: ExpenseSubmission = {
      ...existing,
      status: "submitted",
      updatedAt: now(),
    };
    submissions[idx] = next;
    return next;
  }

  async approve(
    submissionId: string,
    meta: { approvedById: string; ledgerEntryId: string },
  ): Promise<ExpenseSubmission | null> {
    const idx = submissions.findIndex((s) => s.id === submissionId);
    if (idx < 0) return null;
    const existing = submissions[idx];
    if (existing.status !== "submitted") return null;
    const ts = now();
    const next: ExpenseSubmission = {
      ...existing,
      status: "approved",
      approvedById: meta.approvedById,
      approvedAt: ts,
      ledgerEntryId: meta.ledgerEntryId,
      updatedAt: ts,
    };
    submissions[idx] = next;
    return next;
  }

  async deny(
    submissionId: string,
    meta: { deniedById: string; reason?: string },
  ): Promise<ExpenseSubmission | null> {
    const idx = submissions.findIndex((s) => s.id === submissionId);
    if (idx < 0) return null;
    const existing = submissions[idx];
    if (existing.status !== "submitted") return null;
    const next: ExpenseSubmission = {
      ...existing,
      status: "denied",
      approvedById: meta.deniedById,
      approvedAt: now(),
      deniedReason: meta.reason,
      updatedAt: now(),
    };
    submissions[idx] = next;
    return next;
  }

  async remove(submissionId: string): Promise<boolean> {
    const idx = submissions.findIndex((s) => s.id === submissionId);
    if (idx < 0) return false;
    submissions.splice(idx, 1);
    return true;
  }
}

export const memoryExpenseStore = new MemoryExpenseAdapter();

/** @internal test helper — expenses start empty; wipe mutating test rows. */
export function resetExpenseMemoryForTests(): void {
  submissions.splice(0, submissions.length);
}
