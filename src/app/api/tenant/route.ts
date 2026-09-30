import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import type { AuthorizationActor } from "@/lib/authorization/model";
import { isHostedCustomerMode, sessionMfaOk } from "@/lib/auth/mfa-policy";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditLog } from "@/lib/audit/store";
import { auditDbBackend } from "@/lib/db/backend";
import {
  requireTenantOnboardingSession,
  sessionCanCreateUnion,
} from "@/lib/auth/tenant-session";
import {
  canManageLocalModules,
  canManageTenantOnboarding,
  canManageUnionModules,
} from "@/lib/tenant/access";
import {
  canMintLocal,
  isPlatformAdminRole,
} from "@/lib/tenant/local-number-access";
import { dataDbBackend } from "@/lib/db/backend";
import {
  getActiveTenantSeeds,
  getTenantContext,
} from "@/lib/tenant/loader";
import {
  getPortalSurfacesForUnion,
  setPortalSurfacesForUnion,
} from "@/lib/tenant/portal-surfaces";
import {
  clearLocalPresentationPrefs,
  getLocalPresentationPrefs,
  setLocalPresentationPrefs,
} from "@/lib/president/local-prefs";
import {
  createCollectionDurable,
  createDivisionDurable,
  createLocalDurable,
  createUnionDurable,
  setUnionDataModule,
  setUnionEnabledModules,
  hydrateTenantOverlayFromPostgres,
  tenantsPostgresEnabled,
} from "@/lib/tenant/persist";
import {
  visibleHubConfigRows,
} from "@/lib/president/module-catalog";
import type { PortalSurfaceId, PresidentRoleToolId } from "@/lib/president/module-catalog";
import { getPresidentRoleToolsForUnion, setPresidentRoleToolsForUnion } from "@/lib/president/role-tools";
import { parseJsonBody } from "@/lib/validation/parse";
import type { HubModule, TenantContext, UserRole } from "@/types/tenant";

const hubModuleSchema = z.enum([
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

const portalSurfaceSchema = z.enum([
  "announcements",
  "news",
  "elections",
  "discussions",
  "myCases",
  "sidebars",
  "feedback",
]);

const presidentRoleToolSchema = z.enum([
  "financialSummaries",
  "invites",
  "meetings",
  "broadcast",
  "polls",
]);

const createLocalSchema = z.object({
  action: z.literal("create_local"),
  localNumber: z.string().min(1).max(32),
  subText: z.string().max(200).default(""),
  divisionId: z.string().optional(),
  collectionCode: z.string().min(1).max(32).optional(),
  collectionName: z.string().min(1).max(200).optional(),
  /** Brand Kit union preset id (e.g. opseu) — drives CA reference pack seed. */
  unionPresetId: z.string().min(1).max(64).optional(),
  /** Platform admin may target a union other than the session home. */
  unionId: z.string().min(1).optional(),
});

const createCollectionSchema = z.object({
  action: z.literal("create_collection"),
  localId: z.string().min(1),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(200),
  /** Brand Kit union preset id — reseed OPSEU packs when relevant. */
  unionPresetId: z.string().min(1).max(64).optional(),
});

const createCollectiveSchema = z.object({
  action: z.literal("create_collective"),
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(200),
  unionId: z.string().min(1).optional(),
});

const createUnionSchema = z.object({
  action: z.literal("create_union"),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(64).optional(),
  defaultLocale: z.enum(["en", "fr"]).optional(),
  enabledModules: z.array(hubModuleSchema).optional(),
  localNumber: z.string().min(1).max(32).optional(),
  localSubText: z.string().max(200).optional(),
  collectionCode: z.string().min(1).max(32).optional(),
  collectionName: z.string().min(1).max(200).optional(),
  mfaCode: z.string().max(32).optional(),
}).strict();

const setDataModuleSchema = z.object({
  action: z.literal("set_data_module"),
  enabled: z.boolean(),
  /** Platform admin may target a union other than the session home. */
  unionId: z.string().min(1).optional(),
});

const setModulesSchema = z.object({
  action: z.literal("set_modules"),
  enabledModules: z.array(hubModuleSchema).min(1).max(24),
  unionId: z.string().min(1).optional(),
});

const setPortalSurfacesSchema = z.object({
  action: z.literal("set_portal_surfaces"),
  portalSurfaces: z.array(portalSurfaceSchema).max(16),
  unionId: z.string().min(1).optional(),
});

const setPresidentRoleToolsSchema = z.object({
  action: z.literal("set_president_role_tools"),
  presidentRoleTools: z.array(presidentRoleToolSchema).max(16),
  unionId: z.string().min(1).optional(),
});

const setLocalPrefsSchema = z.object({
  action: z.literal("set_local_prefs"),
  localId: z.string().min(1),
  hubModules: z.array(hubModuleSchema).max(24),
  portalSurfaces: z.array(portalSurfaceSchema).max(16),
  /** When true, clear the local filter (fall back to union). */
  clear: z.boolean().optional(),
  unionId: z.string().min(1).optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  createLocalSchema,
  createCollectionSchema,
  createCollectiveSchema,
  createUnionSchema,
  setDataModuleSchema,
  setModulesSchema,
  setPortalSurfacesSchema,
  setPresidentRoleToolsSchema,
  setLocalPrefsSchema,
]);

function resolveOperatorUnionId(
  roles: UserRole[],
  sessionUnionId: string | undefined,
  requestedUnionId: string | null | undefined,
): { ok: true; unionId: string } | { ok: false; status: 400 | 403; error: string } {
  if (requestedUnionId) {
    if (!isPlatformAdminRole(roles)) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: true, unionId: requestedUnionId };
  }
  if (!sessionUnionId) {
    return { ok: false, status: 400, error: "Missing union context" };
  }
  return { ok: true, unionId: sessionUnionId };
}

function scopeTenantContext(
  context: TenantContext | null,
  unionId: string,
  actor: AuthorizationActor,
): TenantContext | null {
  if (!context || isPlatformAdminRole(actor.roles)) return context;
  const visibleLocalIds = new Set(actor.memberships
    .filter((membership) => membership.unionId === unionId)
    .map((membership) => membership.localId));
  const visibleDivisions = context.divisions.filter((division) =>
    context.locals.some((local) => visibleLocalIds.has(local.id) && local.divisionId === division.id));
  return {
    ...context,
    divisions: visibleDivisions,
    division: visibleDivisions.find((division) => division.id === context.local?.divisionId),
    locals: context.locals.filter((local) => visibleLocalIds.has(local.id)),
    bargainingUnits: context.bargainingUnits.filter((unit) => visibleLocalIds.has(unit.localId)),
    local: context.local && visibleLocalIds.has(context.local.id)
      ? context.local
      : undefined,
  };
}

function tenantPayload(
  unionId: string,
  roles: UserRole[],
  session: {
    localId?: string | null;
    canCreateUnion: boolean;
  },
  actor: AuthorizationActor,
  extras?: { unions?: Array<{ id: string; name: string }> },
) {
  const localId = session.localId ?? null;
  const ctx = scopeTenantContext(getTenantContext(unionId, localId), unionId, actor);
  if (!ctx) return null;
  return {
    context: ctx,
    canManageOnboarding: canManageTenantOnboarding(roles),
    canManageUnionModules: canManageUnionModules(roles),
    canManageLocalModules: canManageLocalModules(roles),
    canMintLocal: canMintLocal(roles),
    canCreateUnion: session.canCreateUnion,
    durableTenants: tenantsPostgresEnabled(),
    portalSurfaces: getPortalSurfacesForUnion(unionId),
    presidentRoleTools: getPresidentRoleToolsForUnion(unionId),
    localPrefs: localId ? getLocalPresentationPrefs(unionId, localId) : null,
    sessionLocalId: localId,
    operatorUnionId: unionId,
    isPlatformAdmin: isPlatformAdminRole(roles),
    ...extras,
  };
}

/** Any MFA-verified hub user — powers HubContextSwitcher with overlay merges. */
export async function GET(req?: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  const url = new URL(req?.url ?? "http://localhost/api/tenant");
  const queryUnionId = url.searchParams.get("unionId");
  await hydrateTenantOverlayFromPostgres();

  const unions = getActiveTenantSeeds().map((s) => ({
    id: s.union.id,
    name: s.union.name,
    slug: s.union.slug,
  }));

  if (!session.user.unionId && isPlatformAdminRole(roles) && !queryUnionId) {
    return NextResponse.json({
      needsUnionContext: true,
      unions,
      canManageOnboarding: canManageTenantOnboarding(roles),
      canManageUnionModules: canManageUnionModules(roles),
      canManageLocalModules: canManageLocalModules(roles),
      canMintLocal: canMintLocal(roles),
      canCreateUnion: sessionCanCreateUnion(session),
      durableTenants: tenantsPostgresEnabled(),
      isPlatformAdmin: true,
      sessionLocalId: session.user.localId ?? null,
      operatorUnionId: null,
      context: null,
      portalSurfaces: [],
      presidentRoleTools: [],
      localPrefs: null,
    });
  }

  const resolved = resolveOperatorUnionId(
    roles,
    session.user.unionId,
    queryUnionId,
  );
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }

  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive || (actor.unionId !== resolved.unionId && !isPlatformAdminRole(actor.roles))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const payload = tenantPayload(resolved.unionId, roles, {
    localId: session.user.localId,
    canCreateUnion: sessionCanCreateUnion(session),
  }, actor, isPlatformAdminRole(roles) ? { unions } : undefined);
  if (!payload) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const authResult = await requireTenantOnboardingSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(bodySchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  await hydrateTenantOverlayFromPostgres();

  const data = parsed.data;
  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  const actor = await resolveAuthorizationActor(authResult.session);
  if (!actor.accountActive) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const sessionUnionId = authResult.session.user.unionId;
  const requestedUnionId =
    "unionId" in data && typeof data.unionId === "string"
      ? data.unionId
      : undefined;

  if (data.action === "set_data_module") {
    const resolved = resolveOperatorUnionId(
      roles,
      sessionUnionId,
      requestedUnionId,
    );
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }
    if (!canManageUnionModules(roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (data.enabled && dataDbBackend() !== "postgres") {
      return NextResponse.json(
        { error: "Set DATA_DB_BACKEND=postgres before enabling member data." },
        { status: 503 },
      );
    }
    try {
      await setUnionDataModule(resolved.unionId, data.enabled);
      return NextResponse.json({ enabled: data.enabled });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not update this module.",
        },
        { status: 503 },
      );
    }
  }

  if (data.action === "set_modules") {
    const resolved = resolveOperatorUnionId(
      roles,
      sessionUnionId,
      requestedUnionId,
    );
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }
    if (!canManageLocalModules(roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const unionId = resolved.unionId;
    const ctx = getTenantContext(unionId);
    if (!ctx) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    const requested = data.enabledModules as HubModule[];
    const hadData = ctx.union.enabledModules.includes("data");
    const wantsData = requested.includes("data");
    if (wantsData && !canManageUnionModules(roles)) {
      return NextResponse.json(
        { error: "UnionOps Data requires a union or platform admin." },
        { status: 403 },
      );
    }
    if (wantsData && dataDbBackend() !== "postgres") {
      return NextResponse.json(
        { error: "Set DATA_DB_BACKEND=postgres before enabling member data." },
        { status: 503 },
      );
    }
    const presidentToggleable = new Set(
      visibleHubConfigRows()
        .filter((row) => row.presidentToggle)
        .map((row) => row.id),
    );
    const hadTime = ctx.union.enabledModules.includes("time");
    let next = requested.filter(
      (id) => presidentToggleable.has(id) || id === "data",
    );
    // Platform-gated Time: keep existing enable if already on; do not advertise.
    if (hadTime && !presidentToggleable.has("time") && !next.includes("time")) {
      next = [...next, "time"];
    }
    if (hadData && canManageUnionModules(roles) && wantsData) {
      if (!next.includes("data")) next = [...next, "data"];
    } else if (hadData && !canManageUnionModules(roles)) {
      // Presidents cannot strip Data once an admin enabled it.
      if (!next.includes("data")) next = [...next, "data"];
    } else if (!wantsData) {
      next = next.filter((id) => id !== "data");
    }
    try {
      const enabledModules = await setUnionEnabledModules(unionId, next);
      return NextResponse.json({
        enabledModules,
        context: scopeTenantContext(getTenantContext(unionId, authResult.session.user.localId), unionId, actor),
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not update modules.",
        },
        { status: 503 },
      );
    }
  }

  if (data.action === "set_portal_surfaces") {
    const resolved = resolveOperatorUnionId(
      roles,
      sessionUnionId,
      requestedUnionId,
    );
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }
    if (!canManageLocalModules(roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const portalSurfaces = setPortalSurfacesForUnion(
      resolved.unionId,
      data.portalSurfaces as PortalSurfaceId[],
    );
    return NextResponse.json({ portalSurfaces });
  }

  if (data.action === "set_president_role_tools") {
    const resolved = resolveOperatorUnionId(
      roles,
      sessionUnionId,
      requestedUnionId,
    );
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }
    if (!canManageLocalModules(roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const presidentRoleTools = setPresidentRoleToolsForUnion(
      resolved.unionId,
      data.presidentRoleTools as PresidentRoleToolId[],
    );
    return NextResponse.json({ presidentRoleTools });
  }

  if (data.action === "set_local_prefs") {
    const resolved = resolveOperatorUnionId(
      roles,
      sessionUnionId,
      requestedUnionId,
    );
    if (!resolved.ok) {
      return NextResponse.json(
        { error: resolved.error },
        { status: resolved.status },
      );
    }
    if (!canManageLocalModules(roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const unionId = resolved.unionId;
    const ctx = getTenantContext(unionId);
    if (!ctx) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    if (!ctx.locals.some((local) => local.id === data.localId)) {
      return NextResponse.json({ error: "Local not found" }, { status: 404 });
    }
    if (!isPlatformAdminRole(roles) && !actor.memberships.some((membership) =>
      membership.unionId === unionId && membership.localId === data.localId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (data.clear) {
      clearLocalPresentationPrefs(unionId, data.localId);
      return NextResponse.json({ localPrefs: null, cleared: true });
    }
    const localPrefs = setLocalPresentationPrefs(unionId, data.localId, {
      hubModules: data.hubModules as HubModule[],
      portalSurfaces: data.portalSurfaces as PortalSurfaceId[],
    });
    return NextResponse.json({ localPrefs });
  }

  if (data.action === "create_union") {
    if (!sessionCanCreateUnion(authResult.session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const correlation = createAuditRequestContext();
    const respond = (body: unknown, status = 200) =>
      NextResponse.json(body, {
        status,
        headers: correlation.responseHeaders({
          "Cache-Control": "private, no-store",
        }),
      });
    const actorId = authResult.session.user.id;
    if (
      isHostedCustomerMode() &&
      (!tenantsPostgresEnabled() || auditDbBackend() !== "postgres")
    ) {
      return respond(
        {
          error: "Durable tenant and audit storage are required before creating a union.",
          code: "durable_storage_required",
        },
        503,
      );
    }
    const challenge = await verifyFreshMfaStepUp({
      userId: actorId,
      code: data.mfaCode,
    });
    const record = (
      outcome: "success" | "denied" | "error",
      resourceId: string,
      metadata: Record<string, string>,
      unionId?: string,
      localId?: string,
    ) =>
      auditLog.log({
        userId: actorId,
        action: "tenant.union.provision",
        resourceType: "tenant",
        resourceId,
        ...(unionId ? { unionId } : {}),
        ...(localId ? { localId } : {}),
        outcome,
        requestId: correlation.requestId,
        metadata,
      });
    if (!challenge.ok) {
      try {
        await record(challenge.outcome, "provision-request", {
          reason: `mfa_step_up_${challenge.code}`,
        });
      } catch {
        return respond(
          { error: "Audit service unavailable", code: "audit_unavailable" },
          503,
        );
      }
      const headers = new Headers();
      if (challenge.retryAfterSeconds) {
        headers.set("Retry-After", String(challenge.retryAfterSeconds));
      }
      return NextResponse.json(
        {
          error: "Fresh MFA is required before creating a union.",
          code: `mfa_step_up_${challenge.code}`,
        },
        {
          status: challenge.status,
          headers: correlation.responseHeaders({
            "Cache-Control": "private, no-store",
            ...Object.fromEntries(headers.entries()),
          }),
        },
      );
    }
    try {
      await record("success", "provision-request", { phase: "provision_authorized" });
    } catch {
      return respond(
        {
          error:
            "The union was not created because its authorization audit could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }
    try {
      const seed = await createUnionDurable({
        name: data.name,
        slug: data.slug,
        defaultLocale: data.defaultLocale,
        enabledModules: data.enabledModules as HubModule[] | undefined,
        localNumber: data.localNumber,
        localSubText: data.localSubText,
        collectionCode: data.collectionCode,
        collectionName: data.collectionName,
      });
      await record(
        "success",
        seed.union.id,
        {
          phase: "provision_result",
          firstLocalCreated: String(Boolean(seed.locals?.[0])),
        },
        seed.union.id,
        seed.locals?.[0]?.id,
      );
      return respond({ seed }, 201);
    } catch {
      await record("error", "provision-result", {
        phase: "provision_result_unconfirmed",
      }).catch(() => undefined);
      return respond(
        {
          error:
            "The union may have been created, but its result could not be confirmed. Reload the tenant list before retrying.",
          code: "union_result_unconfirmed",
        },
        503,
      );
    }
  }

  const resolved = resolveOperatorUnionId(
    roles,
    sessionUnionId,
    data.action === "create_local" || data.action === "create_collective"
      ? requestedUnionId
      : undefined,
  );
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status },
    );
  }
  const unionId = resolved.unionId;
  const ctx = getTenantContext(unionId);
  if (!ctx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (data.action === "create_local") {
    if (!canMintLocal(roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (data.divisionId && !ctx.divisions.some((division) => division.id === data.divisionId)) {
      return NextResponse.json({ error: "Bargaining collective not found" }, { status: 404 });
    }
    const local = await createLocalDurable({
      unionId,
      localNumber: data.localNumber,
      subText: data.subText ?? "",
      divisionId: data.divisionId,
    });
    let collection = null;
    if (data.collectionCode && data.collectionName) {
      collection = await createCollectionDurable({
        unionId,
        localId: local.id,
        code: data.collectionCode,
        name: data.collectionName,
      });
      const { syncPreferredLibraryFromCollectionCode } = await import(
        "@/lib/snippets/preferred-library"
      );
      syncPreferredLibraryFromCollectionCode(
        unionId,
        local.id,
        data.collectionCode,
        collection?.id,
      );
    }

    const { unionPresetSeedsReferencePacks } = await import(
      "@/lib/snippets/libraries"
    );
    const { ensureReferencePacksIfEmpty } = await import(
      "@/lib/snippets/ensure-seeded"
    );
    let snippetsSeeded = 0;
    if (unionPresetSeedsReferencePacks(ctx.brandDefaults.commsPresetId ?? "")) {
      const ensure = await ensureReferencePacksIfEmpty(unionId);
      snippetsSeeded = ensure.restored;
    }

    return NextResponse.json(
      {
        local,
        collection,
        snippetsSeeded,
        context: getTenantContext(unionId),
      },
      { status: 201 },
    );
  }

  if (data.action === "create_collective") {
    if (!isPlatformAdminRole(roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (ctx.divisions.some((division) => division.code.toLowerCase() === data.code.toLowerCase())) {
      return NextResponse.json({ error: "Bargaining collective code already exists" }, { status: 409 });
    }
    const collective = await createDivisionDurable({
      unionId,
      code: data.code,
      name: data.name,
      enabledModules: ctx.union.enabledModules,
    });
    return NextResponse.json({ collective, context: getTenantContext(unionId) }, { status: 201 });
  }

  const localExists = ctx.locals.some((l) => l.id === data.localId);
  if (!localExists) {
    return NextResponse.json({ error: "Local not found" }, { status: 404 });
  }
  if (!isPlatformAdminRole(roles) && !actor.memberships.some((membership) =>
    membership.unionId === unionId && membership.localId === data.localId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const collection = await createCollectionDurable({
    unionId,
    localId: data.localId,
    code: data.code,
    name: data.name,
  });
  const { syncPreferredLibraryFromCollectionCode } = await import(
    "@/lib/snippets/preferred-library"
  );
  syncPreferredLibraryFromCollectionCode(
    unionId,
    data.localId,
    data.code,
    collection.id,
  );
  const { unionPresetSeedsReferencePacks } = await import(
    "@/lib/snippets/libraries"
  );
  const { ensureReferencePacksIfEmpty } = await import(
    "@/lib/snippets/ensure-seeded"
  );
  let snippetsSeeded = 0;
  if (unionPresetSeedsReferencePacks(ctx.brandDefaults.commsPresetId ?? "")) {
    const ensure = await ensureReferencePacksIfEmpty(unionId);
    snippetsSeeded = ensure.restored;
  }
  return NextResponse.json(
    { collection, snippetsSeeded, context: scopeTenantContext(getTenantContext(unionId), unionId, actor) },
    { status: 201 },
  );
}
