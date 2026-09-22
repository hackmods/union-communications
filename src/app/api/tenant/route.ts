import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import {
  requireTenantOnboardingSession,
  sessionCanCreateUnion,
} from "@/lib/auth/tenant-session";
import {
  canManageLocalModules,
  canManageTenantOnboarding,
  canManageUnionModules,
} from "@/lib/tenant/access";
import { dataDbBackend } from "@/lib/db/backend";
import { getTenantContext } from "@/lib/tenant/loader";
import {
  getPortalSurfacesForUnion,
  setPortalSurfacesForUnion,
} from "@/lib/tenant/portal-surfaces";
import {
  createCollectionDurable,
  createLocalDurable,
  createUnionDurable,
  setUnionDataModule,
  setUnionEnabledModules,
  hydrateTenantOverlayFromPostgres,
  tenantsPostgresEnabled,
} from "@/lib/tenant/persist";
import { HUB_CONFIG_ROWS } from "@/lib/president/module-catalog";
import type { PortalSurfaceId } from "@/lib/president/module-catalog";
import { parseJsonBody } from "@/lib/validation/parse";
import type { HubModule, UserRole } from "@/types/tenant";

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

const createLocalSchema = z.object({
  action: z.literal("create_local"),
  localNumber: z.string().min(1).max(32),
  subText: z.string().max(200).default(""),
  divisionId: z.string().optional(),
  collectionCode: z.string().min(1).max(32).optional(),
  collectionName: z.string().min(1).max(200).optional(),
});

const createCollectionSchema = z.object({
  action: z.literal("create_collection"),
  localId: z.string().min(1),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(200),
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
});

const setDataModuleSchema = z.object({
  action: z.literal("set_data_module"),
  enabled: z.boolean(),
});

const setModulesSchema = z.object({
  action: z.literal("set_modules"),
  enabledModules: z.array(hubModuleSchema).min(1).max(24),
});

const setPortalSurfacesSchema = z.object({
  action: z.literal("set_portal_surfaces"),
  portalSurfaces: z.array(portalSurfaceSchema).max(16),
});

const bodySchema = z.discriminatedUnion("action", [
  createLocalSchema,
  createCollectionSchema,
  createUnionSchema,
  setDataModuleSchema,
  setModulesSchema,
  setPortalSurfacesSchema,
]);

/** Any MFA-verified hub user — powers HubContextSwitcher with overlay merges. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }
  const unionId = session.user.unionId;
  if (!unionId) {
    return NextResponse.json({ error: "Missing union context" }, { status: 400 });
  }
  await hydrateTenantOverlayFromPostgres();
  const ctx = getTenantContext(unionId, session.user.localId);
  if (!ctx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  return NextResponse.json({
    context: ctx,
    canManageOnboarding: canManageTenantOnboarding(roles),
    canManageUnionModules: canManageUnionModules(roles),
    canManageLocalModules: canManageLocalModules(roles),
    canCreateUnion: sessionCanCreateUnion(session),
    durableTenants: tenantsPostgresEnabled(),
    portalSurfaces: getPortalSurfacesForUnion(unionId),
  });
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
  const unionId = authResult.session.user.unionId;
  const roles = (authResult.session.user.roles ?? []) as UserRole[];

  if (data.action === "set_data_module") {
    if (!unionId || !canManageUnionModules(roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (data.enabled && dataDbBackend() !== "postgres") {
      return NextResponse.json(
        { error: "Set DATA_DB_BACKEND=postgres before enabling member data." },
        { status: 503 },
      );
    }
    try {
      await setUnionDataModule(unionId, data.enabled);
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
    if (!unionId || !canManageLocalModules(roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
      HUB_CONFIG_ROWS.filter((row) => row.presidentToggle).map((row) => row.id),
    );
    let next = requested.filter(
      (id) => presidentToggleable.has(id) || id === "data",
    );
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
        context: getTenantContext(unionId, authResult.session.user.localId),
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
    if (!unionId || !canManageLocalModules(roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const portalSurfaces = setPortalSurfacesForUnion(
      unionId,
      data.portalSurfaces as PortalSurfaceId[],
    );
    return NextResponse.json({ portalSurfaces });
  }

  if (data.action === "create_union") {
    if (!sessionCanCreateUnion(authResult.session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
    return NextResponse.json({ seed }, { status: 201 });
  }

  if (!unionId) {
    return NextResponse.json({ error: "Missing union context" }, { status: 400 });
  }
  const ctx = getTenantContext(unionId);
  if (!ctx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (data.action === "create_local") {
    const local = await createLocalDurable({
      unionId,
      localNumber: data.localNumber,
      subText: data.subText ?? "",
      divisionId: data.divisionId ?? ctx.division?.id,
    });
    let collection = null;
    if (data.collectionCode && data.collectionName) {
      collection = await createCollectionDurable({
        unionId,
        localId: local.id,
        code: data.collectionCode,
        name: data.collectionName,
      });
    }
    return NextResponse.json(
      {
        local,
        collection,
        context: getTenantContext(unionId),
      },
      { status: 201 },
    );
  }

  const localExists = ctx.locals.some((l) => l.id === data.localId);
  if (!localExists) {
    return NextResponse.json({ error: "Local not found" }, { status: 404 });
  }
  const collection = await createCollectionDurable({
    unionId,
    localId: data.localId,
    code: data.code,
    name: data.name,
  });
  return NextResponse.json(
    { collection, context: getTenantContext(unionId) },
    { status: 201 },
  );
}
