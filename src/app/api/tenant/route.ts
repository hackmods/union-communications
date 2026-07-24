import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import {
  requireTenantOnboardingSession,
  sessionCanCreateUnion,
} from "@/lib/auth/tenant-session";
import { canManageTenantOnboarding } from "@/lib/tenant/access";
import { getTenantContext } from "@/lib/tenant/loader";
import {
  createOverlayCollection,
  createOverlayLocal,
  createOverlayUnion,
} from "@/lib/tenant/overlay";
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

const bodySchema = z.discriminatedUnion("action", [
  createLocalSchema,
  createCollectionSchema,
  createUnionSchema,
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
  const ctx = getTenantContext(unionId);
  if (!ctx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  return NextResponse.json({
    context: ctx,
    canManageOnboarding: canManageTenantOnboarding(roles),
    canCreateUnion: sessionCanCreateUnion(session),
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

  const data = parsed.data;
  const unionId = authResult.session.user.unionId;

  if (data.action === "create_union") {
    if (!sessionCanCreateUnion(authResult.session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const seed = createOverlayUnion({
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
    const local = createOverlayLocal({
      unionId,
      localNumber: data.localNumber,
      subText: data.subText ?? "",
      divisionId: data.divisionId ?? ctx.division?.id,
    });
    let collection = null;
    if (data.collectionCode && data.collectionName) {
      collection = createOverlayCollection({
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
  const collection = createOverlayCollection({
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
