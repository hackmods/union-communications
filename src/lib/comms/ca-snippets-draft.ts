/**
 * On-device CA clause snippets for steward Utility tools (Hub `/app/snippets`
 * remains the multi-user library when Officer Hub is on).
 */

import {
  clearJsonDraft,
  loadJsonDraft,
  saveJsonDraft,
} from "@/lib/steward-guides/storage";

export const CA_SNIPPETS_STORAGE_KEY = "unionops-ca-snippets-draft-v1";

export type CaSnippet = {
  id: string;
  title: string;
  body: string;
  tags: string;
};

export type CaSnippetsDraft = {
  snippets: CaSnippet[];
};

export function createEmptyCaSnippetsDraft(): CaSnippetsDraft {
  return { snippets: [] };
}

export function isCaSnippetsDraft(v: unknown): v is CaSnippetsDraft {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  if (!Array.isArray(d.snippets)) return false;
  return d.snippets.every((row) => {
    if (!row || typeof row !== "object") return false;
    const s = row as Record<string, unknown>;
    return (
      typeof s.id === "string" &&
      typeof s.title === "string" &&
      typeof s.body === "string" &&
      typeof s.tags === "string"
    );
  });
}

export function loadCaSnippetsDraft(): CaSnippetsDraft | null {
  return loadJsonDraft(CA_SNIPPETS_STORAGE_KEY, isCaSnippetsDraft);
}

export function saveCaSnippetsDraft(draft: CaSnippetsDraft): boolean {
  return saveJsonDraft(CA_SNIPPETS_STORAGE_KEY, draft);
}

export function clearCaSnippetsDraft(): boolean {
  return clearJsonDraft(CA_SNIPPETS_STORAGE_KEY);
}

export function newCaSnippet(): CaSnippet {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `snip-${Date.now()}`,
    title: "",
    body: "",
    tags: "",
  };
}
