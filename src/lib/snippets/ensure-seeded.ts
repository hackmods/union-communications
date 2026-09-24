/**
 * Idempotent ensure: if a union has zero CA snippets, restore reference packs.
 * Used on first Hub list visit and after local setup for OPSEU/CAAT tenants.
 */

import { loadSnippetSeedPackInputs } from "./seed-packs";
import { snippetStore } from "./store";

export type EnsureSnippetsResult = {
  seeded: boolean;
  restored: number;
  reason?: "already_populated" | "packs_missing" | "seeded";
};

/**
 * When the union library is empty, reseed shipped packs.
 * Safe to call on every list — no-op when rows exist or CSV packs are absent.
 */
export async function ensureReferencePacksIfEmpty(
  unionId: string,
): Promise<EnsureSnippetsResult> {
  const existing = await snippetStore.list({ unionId });
  if (existing.length > 0) {
    return { seeded: false, restored: 0, reason: "already_populated" };
  }

  const packs = loadSnippetSeedPackInputs();
  if (packs.length === 0) {
    return { seeded: false, restored: 0, reason: "packs_missing" };
  }

  const restored = await snippetStore.reseedReferencePacks(unionId);
  return {
    seeded: restored > 0,
    restored,
    reason: restored > 0 ? "seeded" : "packs_missing",
  };
}
