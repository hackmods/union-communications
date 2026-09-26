import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { platformHostBrand } from "@/lib/db/schema/platform-host-brand";
import type { HostBrandDefaults } from "@/lib/constants/host-brand";
import { isTrustedUnionPresetId } from "@/lib/brand/union-preset-bridge";
import {
  getHostBrandOverlay,
  resetHostBrandOverlayForTests,
  resolveHostBrandWithOverlay,
  setHostBrandOverlay,
} from "@/lib/brand/host-brand-overlay";

export {
  getHostBrandOverlay,
  resolveHostBrandWithOverlay,
  setHostBrandOverlay,
} from "@/lib/brand/host-brand-overlay";

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

/** Singleton row id - one instance-wide host brand override. */
export const HOST_BRAND_ROW_ID = "default";

let hostBrandHydrated = false;

/** @internal tests */
export function resetHostBrandStoreForTests(): void {
  resetHostBrandOverlayForTests();
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
        setHostBrandOverlay(normalizePatch(parsed.data));
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
  setHostBrandOverlay(next);
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
  setHostBrandOverlay(null);
  if (!isPostgresConfigured()) return;
  const db = getDb();
  await db
    .delete(platformHostBrand)
    .where(eq(platformHostBrand.id, HOST_BRAND_ROW_ID));
  hostBrandHydrated = true;
}
