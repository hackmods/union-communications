import type { SnippetAdapter, SnippetListFilters } from "./adapter";
import type {
  CaSnippet,
  CreateCaSnippetInput,
  UpdateCaSnippetInput,
} from "@/types/qol";

const snippets: CaSnippet[] = [
  {
    id: "snip-001",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    title: "Just cause for discipline",
    clauseRef: "Article 7.01",
    body: "No employee shall be disciplined or discharged without just cause. The Employer shall provide written reasons upon request.",
    tags: ["discipline", "just-cause", "ft"],
    createdById: "user-president-243",
    createdByName: "Local 243 President",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "snip-002",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-pt",
    title: "Step 1 meeting timeline (PT)",
    clauseRef: "Article 12.02",
    body: "A Step 1 meeting shall be held within seven (7) working days of the grievance being filed for part-time Support Staff, unless the parties agree to an extension in writing.",
    tags: ["grievance", "timeline", "step-1", "pt"],
    createdById: "user-president-243",
    createdByName: "Local 243 President",
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "snip-003",
    unionId: "union-opseu",
    title: "Union representation right",
    clauseRef: "Article 6.03",
    body: "An employee is entitled to union representation at any meeting that may result in discipline. The Employer shall advise the employee of this right in advance.",
    tags: ["representation", "discipline"],
    createdById: "user-president-243",
    createdByName: "Local 243 President",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class MemorySnippetAdapter implements SnippetAdapter {
  async list(filters: SnippetListFilters): Promise<CaSnippet[]> {
    let results = snippets.filter((s) => s.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter(
        (s) => !s.localId || s.localId === filters.localId,
      );
    }
    if (filters.bargainingUnitId) {
      results = results.filter(
        (s) =>
          !s.bargainingUnitId ||
          s.bargainingUnitId === filters.bargainingUnitId,
      );
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.clauseRef.toLowerCase().includes(q) ||
          s.body.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return results.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async getById(snippetId: string): Promise<CaSnippet | null> {
    return snippets.find((s) => s.id === snippetId) ?? null;
  }

  async create(
    input: CreateCaSnippetInput,
    meta: {
      unionId: string;
      createdById: string;
      createdByName: string;
    },
  ): Promise<CaSnippet> {
    const now = new Date().toISOString();
    const snippet: CaSnippet = {
      id: id("snip"),
      unionId: meta.unionId,
      localId: input.localId,
      bargainingUnitId: input.bargainingUnitId,
      title: input.title,
      clauseRef: input.clauseRef,
      body: input.body,
      tags: input.tags ?? [],
      createdById: meta.createdById,
      createdByName: meta.createdByName,
      createdAt: now,
      updatedAt: now,
    };
    snippets.push(snippet);
    return snippet;
  }

  async update(
    snippetId: string,
    input: UpdateCaSnippetInput,
  ): Promise<CaSnippet | null> {
    const idx = snippets.findIndex((s) => s.id === snippetId);
    if (idx < 0) return null;
    snippets[idx] = {
      ...snippets[idx],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    return snippets[idx];
  }

  async remove(snippetId: string): Promise<boolean> {
    const idx = snippets.findIndex((s) => s.id === snippetId);
    if (idx < 0) return false;
    snippets.splice(idx, 1);
    return true;
  }
}

export const snippetStore: SnippetAdapter = new MemorySnippetAdapter();
