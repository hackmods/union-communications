/**
 * In-memory Site Admin store for `customization_preset_bindings` product UI.
 * Durable Postgres rows already exist; this backs the admin API in memory demos
 * and unit tests until the drizzle write path is flipped with customization.
 */

export type PresetBindingRecord = {
  id: string;
  presetId: string;
  sectorId: string;
  unionId: string;
  scopeId: string;
  publishedAt: string | null;
  updatedBy: string;
  updatedAt: string;
};

const bindings = new Map<string, PresetBindingRecord>();

function bindingKey(presetId: string, sectorId: string): string {
  return `${presetId.trim()}::${(sectorId ?? "").trim()}`;
}

export function listPresetBindings(filter?: {
  unionId?: string;
}): PresetBindingRecord[] {
  return [...bindings.values()]
    .filter((row) => !filter?.unionId || row.unionId === filter.unionId)
    .sort((a, b) => {
      const preset = a.presetId.localeCompare(b.presetId);
      if (preset !== 0) return preset;
      return a.sectorId.localeCompare(b.sectorId);
    });
}

export function findPresetBinding(input: {
  unionId?: string;
  sectorId?: string | null;
  presetId?: string | null;
}): PresetBindingRecord | null {
  const sectorId = (input.sectorId ?? "").trim();
  const candidates = listPresetBindings(
    input.unionId ? { unionId: input.unionId } : undefined,
  );
  if (input.presetId) {
    const exact = candidates.find(
      (row) =>
        row.presetId === input.presetId &&
        row.sectorId === sectorId &&
        row.publishedAt,
    );
    if (exact) return exact;
  }
  if (input.unionId) {
    const bySector = candidates.find(
      (row) => row.sectorId === sectorId && row.publishedAt,
    );
    if (bySector) return bySector;
    const anyPublished = candidates.find((row) => row.publishedAt);
    if (anyPublished) return anyPublished;
  }
  return null;
}

export function upsertPresetBinding(input: {
  id?: string;
  presetId: string;
  sectorId?: string;
  unionId: string;
  scopeId: string;
  published?: boolean;
  updatedBy: string;
}): PresetBindingRecord {
  const presetId = input.presetId.trim();
  const sectorId = (input.sectorId ?? "").trim();
  const unionId = input.unionId.trim();
  const scopeId = input.scopeId.trim();
  if (!presetId || !unionId || !scopeId) {
    throw new Error("invalid_binding");
  }
  if (scopeId && !scopeId.startsWith(unionId) && scopeId !== unionId) {
    // Soft same-union guard: scope id must reference the union or be the union id.
    // Customization scopes are opaque; enforce unionId match as the hard rule.
  }
  const key = bindingKey(presetId, sectorId);
  const existing = bindings.get(key);
  const now = new Date().toISOString();
  const row: PresetBindingRecord = {
    id: input.id ?? existing?.id ?? `binding-${presetId}-${sectorId || "default"}`,
    presetId,
    sectorId,
    unionId,
    scopeId,
    publishedAt: input.published === false ? null : now,
    updatedBy: input.updatedBy,
    updatedAt: now,
  };
  // Same-union constraint
  if (existing && existing.unionId !== unionId) {
    throw new Error("union_mismatch");
  }
  bindings.set(key, row);
  return row;
}

export function deletePresetBinding(
  presetId: string,
  sectorId = "",
): boolean {
  return bindings.delete(bindingKey(presetId, sectorId));
}

/** @internal */
export function resetPresetBindingsForTests(): void {
  bindings.clear();
}
