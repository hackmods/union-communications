import type {
  SnippetAdapter,
  SnippetBulkCreateResult,
  SnippetListFilters,
} from "./adapter";
import { buildSeedSnippets, seedSnippetId } from "./seed-packs";
import type { SnippetLibraryId, SnippetLocale } from "./libraries";
import type {
  CaSnippet,
  CreateCaSnippetInput,
  UpdateCaSnippetInput,
} from "@/types/qol";

function seedSnippets(): CaSnippet[] {
  return buildSeedSnippets("union-b7p");
}

const snippets: CaSnippet[] = seedSnippets();

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function duplicateKey(
  clauseRef: string,
  title: string,
  libraryId?: string | null,
  locale?: string | null,
): string {
  return [
    (libraryId ?? "").toLowerCase(),
    (locale ?? "en").toLowerCase(),
    clauseRef.trim().toLowerCase(),
    title.trim().toLowerCase(),
  ].join("::");
}

function isValidInput(input: CreateCaSnippetInput): boolean {
  return Boolean(
    input.title?.trim() && input.clauseRef?.trim() && input.body?.trim(),
  );
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
    if (filters.libraryId) {
      // Selected pack + custom (no library) clauses.
      results = results.filter(
        (s) => !s.libraryId || s.libraryId === filters.libraryId,
      );
    }
    if (filters.locale) {
      results = results.filter((s) => s.locale === filters.locale);
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
    return results.sort((a, b) => {
      const ref = a.clauseRef.localeCompare(b.clauseRef, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      if (ref !== 0) return ref;
      return a.title.localeCompare(b.title);
    });
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
    const locale = (input.locale ?? "en") as SnippetLocale;
    const libraryId = input.libraryId as SnippetLibraryId | undefined;
    const snippet: CaSnippet = {
      id:
        libraryId != null
          ? seedSnippetId(libraryId, locale, input.clauseRef, input.title)
          : id("snip"),
      unionId: meta.unionId,
      localId: input.localId,
      bargainingUnitId: input.bargainingUnitId,
      libraryId,
      locale,
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
    const nextLibrary =
      input.libraryId === null
        ? undefined
        : (input.libraryId ?? snippets[idx].libraryId);
    snippets[idx] = {
      ...snippets[idx],
      title: input.title ?? snippets[idx].title,
      clauseRef: input.clauseRef ?? snippets[idx].clauseRef,
      body: input.body ?? snippets[idx].body,
      tags: input.tags ?? snippets[idx].tags,
      libraryId: nextLibrary,
      locale: input.locale ?? snippets[idx].locale,
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

  async bulkCreate(
    inputs: CreateCaSnippetInput[],
    meta: {
      unionId: string;
      createdById: string;
      createdByName: string;
    },
  ): Promise<SnippetBulkCreateResult> {
    const existing = new Set(
      snippets
        .filter((s) => s.unionId === meta.unionId)
        .map((s) =>
          duplicateKey(s.clauseRef, s.title, s.libraryId, s.locale),
        ),
    );
    let created = 0;
    let skipped = 0;
    for (const input of inputs) {
      if (!isValidInput(input)) {
        skipped += 1;
        continue;
      }
      const key = duplicateKey(
        input.clauseRef,
        input.title,
        input.libraryId,
        input.locale ?? "en",
      );
      if (existing.has(key)) {
        skipped += 1;
        continue;
      }
      await this.create(input, meta);
      existing.add(key);
      created += 1;
    }
    return { created, skipped };
  }

  async resetUnion(unionId: string): Promise<number> {
    let removed = 0;
    for (let i = snippets.length - 1; i >= 0; i -= 1) {
      if (snippets[i].unionId === unionId) {
        snippets.splice(i, 1);
        removed += 1;
      }
    }
    return removed;
  }

  /** Restore CAAT / constitution reference packs after an admin hard-reset. */
  async reseedReferencePacks(unionId: string): Promise<number> {
    const packs = buildSeedSnippets(unionId);
    // Idempotent: replace existing pack rows for this union, keep customs.
    const packIds = new Set(packs.map((p) => p.id));
    for (let i = snippets.length - 1; i >= 0; i -= 1) {
      if (
        snippets[i].unionId === unionId &&
        snippets[i].libraryId &&
        (packIds.has(snippets[i].id) ||
          snippets[i].createdById === "system-seed")
      ) {
        snippets.splice(i, 1);
      }
    }
    snippets.push(...packs);
    return packs.length;
  }
}

export const memorySnippetStore: SnippetAdapter = new MemorySnippetAdapter();

/** @deprecated Use `snippetStore` from `./store` — kept for transitional imports. */
export const snippetStore: SnippetAdapter = memorySnippetStore;

/** @internal test helper — restores demo seed so mutating tests stay isolated. */
export function resetSnippetMemoryForTests(): void {
  snippets.splice(0, snippets.length, ...seedSnippets());
}
