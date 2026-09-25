import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { platformHostBrand } from "@/lib/db/schema/platform-host-brand";
import {
  resolveHostBrandDefaults,
  type HostBrandDefaults,
} from "@/lib/constants/host-brand";
import { isTrustedUnionPresetId } from "@/lib/brand/union-preset-bridge";

const HEX = /^#[0-9A-Fa-f]{6}$/;

export const hostBrandPatchSchema = z
  .object({
    primaryColor: z.string().regex(HEX),
    secondaryColor: z.string().regex(HEX),
    accentColor: z.string().regex(HEX),
    localNumber: z.string().max(32).optional(),
    subText: z.string().max(120).optional(),
    divisionId: z.string().max(64).optional(),
    unionPresetId: z.union([z.string().max(64), z.null()]).optional(),
  })
  .strict();

export type HostBrandPatch = z.infer<typeof hostBrandPatchSchema>;

/** Singleton row id — one instance-wide host brand override. */
export const HOST_BRAND_ROW_ID = "default";

/** In-process overlay (memory + after Postgres hydrate). */
let hostBrandOverlay: Partial<HostBrandDefaults> | null = null;
let hostBrandHydrated = false;

export function getHostBrandOverlay(): Partial<HostBrandDefaults> | null {
  return hostBrandOverlay;
}

export function setHostBrandOverlay(
  patch: Partial<HostBrandDefaults> | null,
): void {
  hostBrandOverlay = patch;
}

/** @internal tests */
export function resetHostBrandStoreForTests(): void {
  hostBrandOverlay = null;
  hostBrandHydrated = false;
}

function normalizePatch(raw: HostBrandPatch): HostBrandDefaults {
  const preset =
    raw.unionPresetId === null
      ? undefined
      : raw.unionPresetId?.trim()
        ? raw.unionPresetId.trim()
        : undefined;
  if (preset && !isTrustedUnionPresetId(preset)) {
    throw new Error("Unknown Comms preset id");
  }
  return {
    primaryColor: raw.primaryColor.toUpperCase(),
    secondaryColor: raw.secondaryColor.toUpperCase(),
    accentColor: raw.accentColor.toUpperCase(),
    localNumber: raw.localNumber?.trim() ?? "",
    subText: raw.subText?.trim() || "Support Staff",
    ...(raw.divisionId?.trim()
      ? { divisionId: raw.divisionId.trim() }
      : {}),
    ...(preset ? { unionPresetId: preset } : {}),
  };
}

/**
 * Resolve instance defaults with durable overlay.
 * Precedence: env → overlay (DB/admin) → host-brand.json → platform orange.
 */
export function resolveHostBrandWithOverlay(
  file?: Partial<HostBrandDefaults>,
): HostBrandDefaults {
  const base = resolveHostBrandDefaults(file);
  const overlay = hostBrandOverlay;
  if (!overlay) return base;

  const envPrimary = process.env.NEXT_PUBLIC_BRAND_PRIMARY?.trim();
  const envSecondary = process.env.NEXT_PUBLIC_BRAND_SECONDARY?.trim();
  const envAccent = process.env.NEXT_PUBLIC_BRAND_ACCENT?.trim();
  const envLocal = process.env.NEXT_PUBLIC_DEFAULT_LOCAL_NUMBER?.trim();
  const envSub = process.env.NEXT_PUBLIC_DEFAULT_SUB_TEXT?.trim();
  const envDivision = process.env.NEXT_PUBLIC_DEFAULT_DIVISION_ID?.trim();
  const envPreset = process.env.NEXT_PUBLIC_BRAND_UNION_PRESET?.trim();

  return {
    primaryColor: envPrimary
      ? base.primaryColor
      : (overlay.primaryColor ?? base.primaryColor),
    secondaryColor: envSecondary
      ? base.secondaryColor
      : (overlay.secondaryColor ?? base.secondaryColor),
    accentColor: envAccent
      ? base.accentColor
      : (overlay.accentColor ?? base.accentColor),
    localNumber: envLocal
      ? base.localNumber
      : (overlay.localNumber ?? base.localNumber),
    subText: envSub ? base.subText : (overlay.subText ?? base.subText),
    ...(envDivision
      ? base.divisionId
        ? { divisionId: base.divisionId }
        : {}
      : overlay.divisionId
        ? { divisionId: overlay.divisionId }
        : base.divisionId
          ? { divisionId: base.divisionId }
          : {}),
    ...(envPreset
      ? base.unionPresetId
        ? { unionPresetId: base.unionPresetId }
        : {}
      : overlay.unionPresetId
        ? { unionPresetId: overlay.unionPresetId }
        : base.unionPresetId
          ? { unionPresetId: base.unionPresetId }
          : {}),
  };
}

export async function hydrateHostBrandFromPostgres(): Promise<void> {
  if (!isPostgresConfigured() || hostBrandHydrated) return;
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(platformHostBrand)
      .where(eq(platformHostBrand.id, HOST_BRAND_ROW_ID))
      .limit(1);
    if (row?.payload && typeof row.payload === "object") {
      const parsed = hostBrandPatchSchema.safeParse(row.payload);
      if (parsed.success) {
        hostBrandOverlay = normalizePatch(parsed.data);
      }
    }
  } finally {
    hostBrandHydrated = true;
  }
}

export async function saveHostBrand(
  raw: HostBrandPatch,
): Promise<HostBrandDefaults> {
  const next = normalizePatch(raw);
  hostBrandOverlay = next;
  if (!isPostgresConfigured()) {
    return next;
  }
  const db = getDb();
  await db
    .insert(platformHostBrand)
    .values({
      id: HOST_BRAND_ROW_ID,
      payload: next,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: platformHostBrand.id,
      set: { payload: next, updatedAt: new Date() },
    });
  hostBrandHydrated = true;
  return next;
}

export async function clearHostBrand(): Promise<void> {
  hostBrandOverlay = null;
  if (!isPostgresConfigured()) return;
  const db = getDb();
  await db
    .delete(platformHostBrand)
    .where(eq(platformHostBrand.id, HOST_BRAND_ROW_ID));
  hostBrandHydrated = true;
}
