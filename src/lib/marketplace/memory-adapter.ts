import type { MarketplaceAdapter, MarketplaceListFilters } from "./adapter";
import type {
  CreateSharedTemplateInput,
  SharedTemplate,
} from "@/types/qol";

const templates: SharedTemplate[] = [
  {
    id: "tmpl-001",
    unionId: "union-opseu",
    localId: "local-243",
    kind: "email",
    title: "Step 1 meeting request (EN)",
    description: "Reusable email opener for scheduling Step 1",
    body: "Subject: Request for Step 1 grievance meeting\n\nDear [Manager],\n\nI am writing to request a Step 1 meeting regarding grievance [ID] filed on [DATE]. Please propose two available times within the next five working days.\n\nIn solidarity,\n[Steward name]",
    sharedById: "user-president-243",
    sharedByName: "Local 243 President",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "tmpl-002",
    unionId: "union-opseu",
    localId: "local-243",
    kind: "checklist",
    title: "New steward intake checklist",
    description: "Handoff checklist for incoming stewards",
    body: "1. Review open grievances assigned to you\n2. Confirm MFA access to the hub\n3. Download hybrid encrypted backup\n4. Meet with outgoing officer\n5. Introduce yourself to members on your list",
    sharedById: "user-president-243",
    sharedByName: "Local 243 President",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "tmpl-003",
    unionId: "union-opseu",
    localId: "local-243",
    kind: "caption",
    title: "Bargaining update social caption",
    description: "Within-union shared social caption",
    body: "Bargaining update: Your bargaining team met today. We are fighting for fair wages, job security, and respect at work. Stay tuned — and talk to your steward if you have questions. #Solidarity",
    sharedById: "user-steward-243",
    sharedByName: "Local 243 Steward",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class MemoryMarketplaceAdapter implements MarketplaceAdapter {
  async list(filters: MarketplaceListFilters): Promise<SharedTemplate[]> {
    let results = templates.filter((t) => t.unionId === filters.unionId);
    if (filters.kind) {
      results = results.filter((t) => t.kind === filters.kind);
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q),
      );
    }
    return results.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getById(templateId: string): Promise<SharedTemplate | null> {
    return templates.find((t) => t.id === templateId) ?? null;
  }

  async create(
    input: CreateSharedTemplateInput,
    meta: {
      unionId: string;
      localId: string;
      sharedById: string;
      sharedByName: string;
    },
  ): Promise<SharedTemplate> {
    const template: SharedTemplate = {
      id: id("tmpl"),
      unionId: meta.unionId,
      localId: meta.localId,
      kind: input.kind,
      title: input.title,
      description: input.description,
      body: input.body,
      sharedById: meta.sharedById,
      sharedByName: meta.sharedByName,
      createdAt: new Date().toISOString(),
    };
    templates.push(template);
    return template;
  }

  async remove(templateId: string): Promise<boolean> {
    const idx = templates.findIndex((t) => t.id === templateId);
    if (idx === -1) return false;
    templates.splice(idx, 1);
    return true;
  }
}

export const marketplaceStore: MarketplaceAdapter =
  new MemoryMarketplaceAdapter();
