import type {
  CreateHubBylawDraftInput,
  HubBylawDraft,
  UpdateHubBylawDraftInput,
} from "@/types/hub-bylaws";
import type {
  HubProposalEvent,
  HubProposalPackage,
  HubProposalRow,
  ProposalPublication,
} from "@/types/hub-proposals";

export interface BylawsAdapter {
  list(unionId: string, localId?: string): Promise<HubBylawDraft[]>;
  get(id: string): Promise<HubBylawDraft | null>;
  create(input: CreateHubBylawDraftInput): Promise<HubBylawDraft>;
  update(id: string, input: UpdateHubBylawDraftInput): Promise<HubBylawDraft | null>;
  remove(id: string): Promise<boolean>;
}

export interface ProposalsAdapter {
  listPackages(unionId: string, localId?: string): Promise<HubProposalPackage[]>;
  getPackage(id: string): Promise<HubProposalPackage | null>;
  createPackage(
    input: Omit<HubProposalPackage, "id" | "createdAt" | "updatedAt" | "publishedAt" | "publishedSummary"> & {
      id?: string;
    },
  ): Promise<HubProposalPackage>;
  updatePackage(
    id: string,
    patch: Partial<
      Pick<
        HubProposalPackage,
        | "name"
        | "roundLabel"
        | "status"
        | "caucusNote"
        | "updatedById"
        | "publishedAt"
        | "publishedSummary"
      >
    >,
  ): Promise<HubProposalPackage | null>;
  removePackage(id: string): Promise<boolean>;
  listRows(packageId: string): Promise<HubProposalRow[]>;
  upsertRow(
    row: Omit<HubProposalRow, "updatedAt"> & { updatedAt?: string },
  ): Promise<HubProposalRow>;
  removeRow(id: string): Promise<boolean>;
  listEvents(packageId: string): Promise<HubProposalEvent[]>;
  addEvent(
    event: Omit<HubProposalEvent, "id" | "createdAt"> & { id?: string },
  ): Promise<HubProposalEvent>;
  listPublications(
    unionId: string,
    localId?: string,
  ): Promise<ProposalPublication[]>;
  publish(
    input: Omit<ProposalPublication, "id" | "publishedAt" | "archivedAt"> & {
      id?: string;
    },
  ): Promise<ProposalPublication>;
  archivePublication(id: string): Promise<boolean>;
}
