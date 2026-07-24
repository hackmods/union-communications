import type {
  CreateLedgerEntryInput,
  LedgerEntry,
  LedgerListFilters,
  UpdateLedgerEntryInput,
} from "@/types/ledger";

export interface LedgerAdapter {
  list(filters: LedgerListFilters): Promise<LedgerEntry[]>;
  getById(id: string): Promise<LedgerEntry | null>;
  create(
    input: CreateLedgerEntryInput,
    meta: {
      unionId: string;
      localId: string;
      recordedById: string;
    },
  ): Promise<LedgerEntry>;
  update(id: string, input: UpdateLedgerEntryInput): Promise<LedgerEntry | null>;
  remove(id: string): Promise<boolean>;
}
