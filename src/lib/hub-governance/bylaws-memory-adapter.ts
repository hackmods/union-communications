import type { BylawsAdapter } from "./adapter";
import type {
  CreateHubBylawDraftInput,
  HubBylawDraft,
  UpdateHubBylawDraftInput,
} from "@/types/hub-bylaws";

function newId(): string {
  return `bylaw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const now = () => new Date().toISOString();

export class MemoryBylawsAdapter implements BylawsAdapter {
  private drafts: HubBylawDraft[] = [];

  async list(unionId: string, localId?: string): Promise<HubBylawDraft[]> {
    return this.drafts
      .filter(
        (d) => d.unionId === unionId && (!localId || d.localId === localId),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<HubBylawDraft | null> {
    return this.drafts.find((d) => d.id === id) ?? null;
  }

  async create(input: CreateHubBylawDraftInput): Promise<HubBylawDraft> {
    const ts = now();
    const draft: HubBylawDraft = {
      id: newId(),
      unionId: input.unionId,
      localId: input.localId,
      title: input.title,
      status: input.status ?? "draft",
      mode: input.mode ?? "template",
      form: input.form,
      updatedById: input.updatedById,
      createdAt: ts,
      updatedAt: ts,
    };
    this.drafts.push(draft);
    return draft;
  }

  async update(
    id: string,
    input: UpdateHubBylawDraftInput,
  ): Promise<HubBylawDraft | null> {
    const idx = this.drafts.findIndex((d) => d.id === id);
    if (idx < 0) return null;
    const prev = this.drafts[idx]!;
    const next: HubBylawDraft = {
      ...prev,
      title: input.title ?? prev.title,
      status: input.status ?? prev.status,
      mode: input.mode ?? prev.mode,
      form: input.form ?? prev.form,
      updatedById: input.updatedById,
      updatedAt: now(),
    };
    this.drafts[idx] = next;
    return next;
  }

  async remove(id: string): Promise<boolean> {
    const before = this.drafts.length;
    this.drafts = this.drafts.filter((d) => d.id !== id);
    return this.drafts.length < before;
  }

  reset(): void {
    this.drafts = [];
  }
}

export const memoryBylawsStore = new MemoryBylawsAdapter();
