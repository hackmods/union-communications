/**
 * Durable Comms preset catalog overlay.
 * Compiled `UNION_PRESETS` remains the fallback; operators may add/override via Site Admin.
 */

import {
  UNION_PRESETS,
  getUnionPreset,
  type UnionBranding,
} from "@/lib/constants/unionPresets";

export type DurableCommsPreset = {
  id: string;
  name: string;
  nameFr?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  logoText?: string;
  defaultSlogans: string[];
  archivedAt?: string | null;
  updatedAt: string;
  updatedBy: string;
};

const durableCatalog = new Map<string, DurableCommsPreset>();

export function listDurableCommsPresets(includeArchived = false): DurableCommsPreset[] {
  return [...durableCatalog.values()]
    .filter((row) => includeArchived || !row.archivedAt)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getDurableCommsPreset(id: string): DurableCommsPreset | null {
  return durableCatalog.get(id) ?? null;
}

export function upsertDurableCommsPreset(
  input: Omit<DurableCommsPreset, "updatedAt"> & { updatedAt?: string },
): DurableCommsPreset {
  const id = input.id.trim().toLowerCase();
  if (!id || !/^[a-z0-9][a-z0-9_-]{1,62}$/.test(id)) {
    throw new Error("invalid_preset_id");
  }
  const row: DurableCommsPreset = {
    id,
    name: input.name.trim(),
    nameFr: input.nameFr?.trim() || undefined,
    primaryColor: input.primaryColor.toUpperCase(),
    secondaryColor: input.secondaryColor.toUpperCase(),
    accentColor: input.accentColor?.toUpperCase(),
    logoText: input.logoText?.trim(),
    defaultSlogans: input.defaultSlogans.map((s) => s.trim()).filter(Boolean),
    archivedAt: input.archivedAt ?? null,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
    updatedBy: input.updatedBy,
  };
  if (!row.name) throw new Error("invalid_preset_name");
  durableCatalog.set(id, row);
  return row;
}

export function archiveDurableCommsPreset(
  id: string,
  updatedBy: string,
): DurableCommsPreset | null {
  const existing = durableCatalog.get(id);
  if (!existing) return null;
  const next = {
    ...existing,
    archivedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  durableCatalog.set(id, next);
  return next;
}

export function durablePresetToUnionBranding(
  row: DurableCommsPreset,
): UnionBranding {
  return {
    id: row.id,
    name: row.name,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    accentColor: row.accentColor,
    logoText: row.logoText,
    defaultSlogans:
      row.defaultSlogans.length > 0 ? row.defaultSlogans : [row.name],
  };
}

/**
 * Resolve a Comms preset: durable non-archived first, else compiled UNION_PRESETS.
 */
export function resolveCommsPreset(id: string | null | undefined): {
  id: string;
  source: "durable" | "compiled";
  compiled: UnionBranding;
} | null {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  const durable = durableCatalog.get(trimmed);
  if (durable && !durable.archivedAt) {
    return {
      id: trimmed,
      source: "durable",
      compiled: durablePresetToUnionBranding(durable),
    };
  }
  const compiled = getUnionPreset(trimmed);
  if (!compiled) return null;
  return { id: trimmed, source: "compiled", compiled };
}

export function listMergedCommsPresets(): Array<{
  id: string;
  name: string;
  source: "durable" | "compiled";
}> {
  const byId = new Map<string, { id: string; name: string; source: "durable" | "compiled" }>();
  for (const preset of UNION_PRESETS) {
    byId.set(preset.id, {
      id: preset.id,
      name: preset.name,
      source: "compiled",
    });
  }
  for (const row of listDurableCommsPresets(false)) {
    byId.set(row.id, {
      id: row.id,
      name: row.name,
      source: "durable",
    });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function isTrustedCommsPresetId(
  value: string | null | undefined,
): value is string {
  return resolveCommsPreset(value) != null;
}

/** @internal */
export function resetCommsPresetCatalogForTests(): void {
  durableCatalog.clear();
}
