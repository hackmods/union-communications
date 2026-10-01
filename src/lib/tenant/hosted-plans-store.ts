/**
 * Durable read/write for hosted plan rows on unions and locals (ADR-024).
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { locals, unions } from "@/lib/db/schema/tenant";
import {
  UNSET_HOSTED_PLAN,
  defaultSeatCapForSku,
  hostedPlanFromRow,
  type HostedAccessClass,
  type HostedCommercialClass,
  type HostedPlanRecord,
  type HostedSeatSku,
} from "@/lib/tenant/hosted-plans";
import {
  setLocalHostedPlanPatch,
  setUnionHostedPlanPatch,
} from "@/lib/tenant/overlay";
import type { HubModule } from "@/types/tenant";
import type { PortalSurfaceId } from "@/lib/president/module-catalog";

export type HostedPlanScope = "union" | "local";

export type HostedPlanPatch = {
  accessClass?: HostedAccessClass;
  commercialClass?: HostedCommercialClass;
  seatSku?: HostedSeatSku | null;
  seatCap?: number | null;
  moduleSubset?: HubModule[] | null;
  portalSurfaceSubset?: PortalSurfaceId[] | null;
  donationAcknowledged?: boolean;
  notes?: string;
};

export async function getUnionHostedPlan(
  unionId: string,
): Promise<HostedPlanRecord | null> {
  if (!isPostgresConfigured()) return null;
  const rows = await getDb()
    .select({
      hostedAccessClass: unions.hostedAccessClass,
      hostedCommercialClass: unions.hostedCommercialClass,
      hostedSeatSku: unions.hostedSeatSku,
      hostedSeatCap: unions.hostedSeatCap,
      hostedModuleSubset: unions.hostedModuleSubset,
      hostedPortalSurfaceSubset: unions.hostedPortalSurfaceSubset,
      hostedDonationAcknowledged: unions.hostedDonationAcknowledged,
      hostedPlanNotes: unions.hostedPlanNotes,
    })
    .from(unions)
    .where(and(eq(unions.id, unionId), isNull(unions.archivedAt)))
    .limit(1);
  if (!rows[0]) return null;
  return hostedPlanFromRow(rows[0]);
}

export async function getLocalHostedPlan(
  localId: string,
): Promise<HostedPlanRecord | null> {
  if (!isPostgresConfigured()) return null;
  const rows = await getDb()
    .select({
      hostedAccessClass: locals.hostedAccessClass,
      hostedCommercialClass: locals.hostedCommercialClass,
      hostedSeatSku: locals.hostedSeatSku,
      hostedSeatCap: locals.hostedSeatCap,
      hostedModuleSubset: locals.hostedModuleSubset,
      hostedPortalSurfaceSubset: locals.hostedPortalSurfaceSubset,
      hostedDonationAcknowledged: locals.hostedDonationAcknowledged,
      hostedPlanNotes: locals.hostedPlanNotes,
    })
    .from(locals)
    .where(and(eq(locals.id, localId), isNull(locals.archivedAt)))
    .limit(1);
  if (!rows[0]) return null;
  return hostedPlanFromRow(rows[0]);
}

export async function listHostedPlanTenants(): Promise<{
  unions: Array<{
    id: string;
    name: string;
    slug: string;
    plan: HostedPlanRecord;
  }>;
  locals: Array<{
    id: string;
    unionId: string;
    localNumber: string;
    plan: HostedPlanRecord;
  }>;
}> {
  if (!isPostgresConfigured()) {
    return { unions: [], locals: [] };
  }
  const db = getDb();
  const unionRows = await db
    .select({
      id: unions.id,
      name: unions.name,
      slug: unions.slug,
      hostedAccessClass: unions.hostedAccessClass,
      hostedCommercialClass: unions.hostedCommercialClass,
      hostedSeatSku: unions.hostedSeatSku,
      hostedSeatCap: unions.hostedSeatCap,
      hostedModuleSubset: unions.hostedModuleSubset,
      hostedPortalSurfaceSubset: unions.hostedPortalSurfaceSubset,
      hostedDonationAcknowledged: unions.hostedDonationAcknowledged,
      hostedPlanNotes: unions.hostedPlanNotes,
    })
    .from(unions)
    .where(isNull(unions.archivedAt))
    .orderBy(asc(unions.name));

  const localRows = await db
    .select({
      id: locals.id,
      unionId: locals.unionId,
      localNumber: locals.localNumber,
      hostedAccessClass: locals.hostedAccessClass,
      hostedCommercialClass: locals.hostedCommercialClass,
      hostedSeatSku: locals.hostedSeatSku,
      hostedSeatCap: locals.hostedSeatCap,
      hostedModuleSubset: locals.hostedModuleSubset,
      hostedPortalSurfaceSubset: locals.hostedPortalSurfaceSubset,
      hostedDonationAcknowledged: locals.hostedDonationAcknowledged,
      hostedPlanNotes: locals.hostedPlanNotes,
    })
    .from(locals)
    .where(isNull(locals.archivedAt))
    .orderBy(asc(locals.localNumber));

  return {
    unions: unionRows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      plan: hostedPlanFromRow(r),
    })),
    locals: localRows.map((r) => ({
      id: r.id,
      unionId: r.unionId,
      localNumber: r.localNumber,
      plan: hostedPlanFromRow(r),
    })),
  };
}

function columnsFromPatch(
  patch: HostedPlanPatch,
  actorId: string,
): Record<string, unknown> {
  const seatSku =
    patch.seatSku !== undefined ? patch.seatSku : undefined;
  const seatCap =
    patch.seatCap !== undefined
      ? patch.seatCap
      : seatSku !== undefined
        ? defaultSeatCapForSku(seatSku)
        : undefined;

  return {
    ...(patch.accessClass !== undefined
      ? { hostedAccessClass: patch.accessClass }
      : {}),
    ...(patch.commercialClass !== undefined
      ? { hostedCommercialClass: patch.commercialClass }
      : {}),
    ...(seatSku !== undefined ? { hostedSeatSku: seatSku } : {}),
    ...(seatCap !== undefined ? { hostedSeatCap: seatCap } : {}),
    ...(patch.moduleSubset !== undefined
      ? { hostedModuleSubset: patch.moduleSubset }
      : {}),
    ...(patch.portalSurfaceSubset !== undefined
      ? { hostedPortalSurfaceSubset: patch.portalSurfaceSubset }
      : {}),
    ...(patch.donationAcknowledged !== undefined
      ? { hostedDonationAcknowledged: patch.donationAcknowledged }
      : {}),
    ...(patch.notes !== undefined ? { hostedPlanNotes: patch.notes } : {}),
    hostedPlanUpdatedAt: new Date(),
    hostedPlanUpdatedBy: actorId,
  };
}

export async function setUnionHostedPlan(
  unionId: string,
  patch: HostedPlanPatch,
  actorId: string,
): Promise<boolean> {
  if (!isPostgresConfigured()) {
    throw new Error("Durable database required for hosted plans");
  }
  const rows = await getDb()
    .update(unions)
    .set(columnsFromPatch(patch, actorId))
    .where(and(eq(unions.id, unionId), isNull(unions.archivedAt)))
    .returning({ id: unions.id });
  if (rows.length > 0) {
    const current = (await getUnionHostedPlan(unionId)) ?? UNSET_HOSTED_PLAN;
    setUnionHostedPlanPatch(unionId, current);
  }
  return rows.length > 0;
}

export async function setLocalHostedPlan(
  localId: string,
  patch: HostedPlanPatch,
  actorId: string,
): Promise<boolean> {
  if (!isPostgresConfigured()) {
    throw new Error("Durable database required for hosted plans");
  }
  const rows = await getDb()
    .update(locals)
    .set(columnsFromPatch(patch, actorId))
    .where(and(eq(locals.id, localId), isNull(locals.archivedAt)))
    .returning({ id: locals.id });
  if (rows.length > 0) {
    const current = (await getLocalHostedPlan(localId)) ?? UNSET_HOSTED_PLAN;
    setLocalHostedPlanPatch(localId, current);
  }
  return rows.length > 0;
}
