/**
 * Hosted Hub/Portal plan catalog (ADR-024).
 *
 * Access class drives feature caps. Commercial class is billing-only:
 * Member and Paid share the same Full access.
 *
 * CapRover dual gate: UNIONOPS_HOSTED_PLANS_ENABLED must be true before
 * caps apply. When the flag is off, resolvers fail open (legacy behaviour).
 */

import type { HubModule } from "@/types/tenant";
import type { PortalSurfaceId } from "@/lib/president/module-catalog";
import {
  DEFAULT_PORTAL_SURFACES,
  PRESIDENT_HUB_DEFAULT_ON,
} from "@/lib/president/module-catalog";

export const HOSTED_PLANS_ENV_KEY = "UNIONOPS_HOSTED_PLANS_ENABLED";

export type HostedAccessClass = "unset" | "free" | "full";
export type HostedCommercialClass = "unset" | "member" | "paid";
export type HostedSeatSku = "solo" | "exec_under_50" | "custom";

/** Operator-internal CAD cents — never surface on public pages. */
export const HOSTED_SEAT_SKU_CENTS = {
  solo: 2000,
  exec_under_50: 5000,
} as const;

export const HOSTED_SEAT_SKU_CAPS: Record<HostedSeatSku, number | null> = {
  solo: 1,
  exec_under_50: 49,
  custom: null,
};

/** Free tier Hub modules — thin tease that still helps. */
export const FREE_HUB_MODULES: readonly HubModule[] = [
  "comms",
  "discussions",
  "portal",
] as const;

/** Free tier Portal surfaces. */
export const FREE_PORTAL_SURFACES: readonly PortalSurfaceId[] = [
  "announcements",
  "discussions",
] as const;

/** Full access starting set (Member ≡ Paid) — widenable to union ceiling / subset. */
export const FULL_HUB_MODULES_DEFAULT: readonly HubModule[] =
  PRESIDENT_HUB_DEFAULT_ON;

export type HostedPlanRecord = {
  accessClass: HostedAccessClass;
  commercialClass: HostedCommercialClass;
  seatSku: HostedSeatSku | null;
  seatCap: number | null;
  /** When set, Full access is narrowed to this allowlist (intersected with union modules). */
  moduleSubset: HubModule[] | null;
  portalSurfaceSubset: PortalSurfaceId[] | null;
  donationAcknowledged: boolean;
  notes: string;
};

export const UNSET_HOSTED_PLAN: HostedPlanRecord = {
  accessClass: "unset",
  commercialClass: "unset",
  seatSku: null,
  seatCap: null,
  moduleSubset: null,
  portalSurfaceSubset: null,
  donationAcknowledged: false,
  notes: "",
};

/** True when CapRover has flipped hosted plan enforcement on. */
export function isHostedPlansEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[HOSTED_PLANS_ENV_KEY]?.trim() === "true";
}

/**
 * Member and Paid are the same for access — both map to Full.
 * Commercial class never drives module gates.
 */
export function accessClassForCommercial(
  commercial: HostedCommercialClass,
): HostedAccessClass {
  if (commercial === "member" || commercial === "paid") return "full";
  return "unset";
}

export function defaultSeatCapForSku(sku: HostedSeatSku | null): number | null {
  if (!sku) return null;
  return HOSTED_SEAT_SKU_CAPS[sku];
}

/**
 * Local overrides union when local accessClass is not unset.
 * Commercial/SKU/notes: local wins when local commercial is set; else union.
 */
export function resolveInheritedPlan(
  unionPlan: HostedPlanRecord,
  localPlan: HostedPlanRecord,
): HostedPlanRecord {
  const accessClass =
    localPlan.accessClass !== "unset"
      ? localPlan.accessClass
      : unionPlan.accessClass;

  const commercialClass =
    localPlan.commercialClass !== "unset"
      ? localPlan.commercialClass
      : unionPlan.commercialClass;

  const seatSku =
    localPlan.commercialClass !== "unset"
      ? localPlan.seatSku
      : unionPlan.seatSku;

  const seatCap =
    localPlan.commercialClass !== "unset"
      ? localPlan.seatCap
      : unionPlan.seatCap;

  const moduleSubset = intersectNullableSubsets(
    unionPlan.moduleSubset,
    localPlan.moduleSubset,
  );
  const portalSurfaceSubset = intersectNullableSubsets(
    unionPlan.portalSurfaceSubset,
    localPlan.portalSurfaceSubset,
  );

  const donationAcknowledged =
    localPlan.commercialClass !== "unset" || localPlan.accessClass !== "unset"
      ? localPlan.donationAcknowledged
      : unionPlan.donationAcknowledged;

  const notes =
    localPlan.notes.trim().length > 0 ? localPlan.notes : unionPlan.notes;

  // If commercial implies full but access still unset, lift access to full.
  const liftedAccess =
    accessClass === "unset" &&
    (commercialClass === "member" || commercialClass === "paid")
      ? "full"
      : accessClass;

  return {
    accessClass: liftedAccess,
    commercialClass,
    seatSku,
    seatCap: seatCap ?? defaultSeatCapForSku(seatSku),
    moduleSubset,
    portalSurfaceSubset,
    donationAcknowledged,
    notes,
  };
}

function intersectNullableSubsets<T extends string>(
  unionSubset: T[] | null,
  localSubset: T[] | null,
): T[] | null {
  if (!unionSubset && !localSubset) return null;
  if (unionSubset && !localSubset) return [...unionSubset];
  if (!unionSubset && localSubset) return [...localSubset];
  const allowed = new Set(unionSubset!);
  return localSubset!.filter((id) => allowed.has(id));
}

export type ResolveEffectiveModulesInput = {
  unionModules: readonly HubModule[];
  unionPlan: HostedPlanRecord;
  localPlan: HostedPlanRecord;
  /** When false (default CapRover), return union modules unchanged. */
  enforcementEnabled?: boolean;
};

/**
 * Effective Hub modules for a local session.
 * Fail-open when enforcement is off or plan is unset.
 * When flag on and plan unset → treat as Free (safe default for dark pilots).
 */
export function resolveEffectiveHubModules(
  input: ResolveEffectiveModulesInput,
): HubModule[] {
  const unionSet = new Set(input.unionModules);
  const base = input.unionModules.filter((m) => unionSet.has(m));

  if (!(input.enforcementEnabled ?? isHostedPlansEnabled())) {
    return [...base];
  }

  const plan = resolveInheritedPlan(input.unionPlan, input.localPlan);
  const access =
    plan.accessClass === "unset" ? ("free" as const) : plan.accessClass;

  if (access === "free") {
    return FREE_HUB_MODULES.filter((m) => unionSet.has(m));
  }

  // Full: union ceiling, optionally narrowed by subset.
  if (plan.moduleSubset && plan.moduleSubset.length > 0) {
    const subset = new Set(plan.moduleSubset);
    return base.filter((m) => subset.has(m));
  }

  return [...base];
}

export type ResolveEffectiveSurfacesInput = {
  unionSurfaces: readonly PortalSurfaceId[];
  unionPlan: HostedPlanRecord;
  localPlan: HostedPlanRecord;
  enforcementEnabled?: boolean;
};

export function resolveEffectivePortalSurfaces(
  input: ResolveEffectiveSurfacesInput,
): PortalSurfaceId[] {
  const unionBase =
    input.unionSurfaces.length > 0
      ? [...input.unionSurfaces]
      : [...DEFAULT_PORTAL_SURFACES];
  const unionSet = new Set(unionBase);

  if (!(input.enforcementEnabled ?? isHostedPlansEnabled())) {
    return unionBase.filter((s) => unionSet.has(s));
  }

  const plan = resolveInheritedPlan(input.unionPlan, input.localPlan);
  const access =
    plan.accessClass === "unset" ? ("free" as const) : plan.accessClass;

  if (access === "free") {
    return FREE_PORTAL_SURFACES.filter((s) => unionSet.has(s));
  }

  if (plan.portalSurfaceSubset && plan.portalSurfaceSubset.length > 0) {
    const subset = new Set(plan.portalSurfaceSubset);
    return unionBase.filter((s) => subset.has(s));
  }

  return unionBase;
}

export function parseAccessClass(raw: unknown): HostedAccessClass {
  if (raw === "free" || raw === "full" || raw === "unset") return raw;
  return "unset";
}

export function parseCommercialClass(raw: unknown): HostedCommercialClass {
  if (raw === "member" || raw === "paid" || raw === "unset") return raw;
  return "unset";
}

export function parseSeatSku(raw: unknown): HostedSeatSku | null {
  if (raw === "solo" || raw === "exec_under_50" || raw === "custom") return raw;
  return null;
}

export function parseHubModuleSubset(raw: unknown): HubModule[] | null {
  if (!Array.isArray(raw)) return null;
  const allowed = new Set<string>([
    "comms",
    "grievance",
    "bumping",
    "time",
    "discussions",
    "tasks",
    "informalLog",
    "checkins",
    "portal",
    "bylaws",
    "proposals",
    "data",
    "documents",
    "expenses",
    "travel",
  ]);
  const out = raw.filter(
    (id): id is HubModule => typeof id === "string" && allowed.has(id),
  );
  return out.length > 0 ? out : null;
}

export function parsePortalSurfaceSubset(
  raw: unknown,
): PortalSurfaceId[] | null {
  if (!Array.isArray(raw)) return null;
  const allowed = new Set<string>([
    "announcements",
    "news",
    "elections",
    "discussions",
    "myCases",
    "sidebars",
    "feedback",
  ]);
  const out = raw.filter(
    (id): id is PortalSurfaceId => typeof id === "string" && allowed.has(id),
  );
  return out.length > 0 ? out : null;
}

/** Normalize a DB/API row into a HostedPlanRecord. */
export function hostedPlanFromRow(row: {
  hostedAccessClass?: string | null;
  hostedCommercialClass?: string | null;
  hostedSeatSku?: string | null;
  hostedSeatCap?: number | null;
  hostedModuleSubset?: unknown;
  hostedPortalSurfaceSubset?: unknown;
  hostedDonationAcknowledged?: boolean | null;
  hostedPlanNotes?: string | null;
}): HostedPlanRecord {
  const seatSku = parseSeatSku(row.hostedSeatSku);
  return {
    accessClass: parseAccessClass(row.hostedAccessClass),
    commercialClass: parseCommercialClass(row.hostedCommercialClass),
    seatSku,
    seatCap:
      typeof row.hostedSeatCap === "number"
        ? row.hostedSeatCap
        : defaultSeatCapForSku(seatSku),
    moduleSubset: parseHubModuleSubset(row.hostedModuleSubset),
    portalSurfaceSubset: parsePortalSurfaceSubset(
      row.hostedPortalSurfaceSubset,
    ),
    donationAcknowledged: row.hostedDonationAcknowledged === true,
    notes: typeof row.hostedPlanNotes === "string" ? row.hostedPlanNotes : "",
  };
}
