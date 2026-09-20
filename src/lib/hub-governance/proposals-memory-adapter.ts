import type { ProposalsAdapter } from "./adapter";
import type {
  HubProposalEvent,
  HubProposalPackage,
  HubProposalRow,
  ProposalPublication,
} from "@/types/hub-proposals";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const now = () => new Date().toISOString();

export class MemoryProposalsAdapter implements ProposalsAdapter {
  private packages: HubProposalPackage[] = [];
  private rows: HubProposalRow[] = [];
  private events: HubProposalEvent[] = [];
  private publications: ProposalPublication[] = [];

  async listPackages(
    unionId: string,
    localId?: string,
  ): Promise<HubProposalPackage[]> {
    return this.packages
      .filter(
        (p) =>
          p.unionId === unionId && (!localId || p.localId === localId),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getPackage(id: string): Promise<HubProposalPackage | null> {
    return this.packages.find((p) => p.id === id) ?? null;
  }

  async removePackage(id: string): Promise<boolean> {
    const before = this.packages.length;
    this.packages = this.packages.filter((p) => p.id !== id);
    this.rows = this.rows.filter((r) => r.packageId !== id);
    this.events = this.events.filter((e) => e.packageId !== id);
    this.publications = this.publications.filter((p) => p.packageId !== id);
    return this.packages.length < before;
  }

  async createPackage(
    input: Omit<
      HubProposalPackage,
      "id" | "createdAt" | "updatedAt" | "publishedAt" | "publishedSummary"
    > & { id?: string },
  ): Promise<HubProposalPackage> {
    const ts = now();
    const pkg: HubProposalPackage = {
      id: input.id ?? newId("ppkg"),
      unionId: input.unionId,
      localId: input.localId,
      bargainingUnitId: input.bargainingUnitId,
      name: input.name,
      roundLabel: input.roundLabel,
      status: input.status,
      caucusNote: input.caucusNote,
      createdById: input.createdById,
      updatedById: input.updatedById,
      createdAt: ts,
      updatedAt: ts,
    };
    this.packages.push(pkg);
    return pkg;
  }

  async updatePackage(
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
  ): Promise<HubProposalPackage | null> {
    const idx = this.packages.findIndex((p) => p.id === id);
    if (idx < 0) return null;
    const prev = this.packages[idx]!;
    const next: HubProposalPackage = {
      ...prev,
      ...patch,
      updatedAt: now(),
    };
    this.packages[idx] = next;
    return next;
  }

  async listRows(packageId: string): Promise<HubProposalRow[]> {
    return this.rows
      .filter((r) => r.packageId === packageId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async upsertRow(
    row: Omit<HubProposalRow, "updatedAt"> & { updatedAt?: string },
  ): Promise<HubProposalRow> {
    const idx = this.rows.findIndex((r) => r.id === row.id);
    const next: HubProposalRow = { ...row, updatedAt: now() };
    if (idx >= 0) this.rows[idx] = next;
    else this.rows.push(next);
    return next;
  }

  async removeRow(id: string): Promise<boolean> {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.id !== id);
    return this.rows.length < before;
  }

  async listEvents(packageId: string): Promise<HubProposalEvent[]> {
    return this.events
      .filter((e) => e.packageId === packageId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addEvent(
    event: Omit<HubProposalEvent, "id" | "createdAt"> & { id?: string },
  ): Promise<HubProposalEvent> {
    const next: HubProposalEvent = {
      ...event,
      id: event.id ?? newId("pevt"),
      createdAt: now(),
    };
    this.events.push(next);
    return next;
  }

  async listPublications(
    unionId: string,
    localId?: string,
  ): Promise<ProposalPublication[]> {
    return this.publications
      .filter(
        (p) =>
          p.unionId === unionId &&
          (!localId || p.localId === localId) &&
          !p.archivedAt,
      )
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  async publish(
    input: Omit<ProposalPublication, "id" | "publishedAt" | "archivedAt"> & {
      id?: string;
    },
  ): Promise<ProposalPublication> {
    const pub: ProposalPublication = {
      id: input.id ?? newId("ppub"),
      packageId: input.packageId,
      unionId: input.unionId,
      localId: input.localId,
      headline: input.headline,
      bullets: [...input.bullets],
      guideHref: input.guideHref,
      publishedById: input.publishedById,
      publishedAt: now(),
    };
    this.publications.push(pub);
    return pub;
  }

  async archivePublication(id: string): Promise<boolean> {
    const pub = this.publications.find((p) => p.id === id);
    if (!pub) return false;
    pub.archivedAt = now();
    return true;
  }

  reset(): void {
    this.packages = [];
    this.rows = [];
    this.events = [];
    this.publications = [];
  }
}

export const memoryProposalsStore = new MemoryProposalsAdapter();
