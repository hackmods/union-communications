import type {
  CreateExpenseSubmissionInput,
  ExpenseListFilters,
  ExpenseSubmission,
  UpdateExpenseSubmissionInput,
} from "@/types/expenses";

export interface ExpenseAdapter {
  list(filters: ExpenseListFilters): Promise<ExpenseSubmission[]>;
  getById(id: string): Promise<ExpenseSubmission | null>;
  create(
    input: CreateExpenseSubmissionInput,
    meta: {
      unionId: string;
      localId: string;
      submittedById: string;
      submittedByName: string;
    },
  ): Promise<ExpenseSubmission>;
  update(
    id: string,
    input: UpdateExpenseSubmissionInput,
  ): Promise<ExpenseSubmission | null>;
  submit(id: string): Promise<ExpenseSubmission | null>;
  approve(
    id: string,
    meta: { approvedById: string; ledgerEntryId: string },
  ): Promise<ExpenseSubmission | null>;
  deny(
    id: string,
    meta: { deniedById: string; reason?: string },
  ): Promise<ExpenseSubmission | null>;
  remove(id: string): Promise<boolean>;
}
