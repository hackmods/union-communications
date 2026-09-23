import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import { createInvite, listInvitesForUnion } from "@/lib/auth/invites";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability } from "@/lib/authorization/model";
import {
  buildInviteAcceptEmail,
  emailAppBaseUrl,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  canInviteRoles,
  inviteRolesForActor,
} from "@/lib/tenant/access";
import {
  canElevateLocalNumber,
} from "@/lib/tenant/local-number-access";
import { getTenantContext, getAllTenantSeeds } from "@/lib/tenant/loader";
import {
  findOrCreateLocal,
  hydrateTenantOverlayFromPostgres,
  createCollectionDurable,
  createUnionDurable,
} from "@/lib/tenant/persist";
import { parseJsonBody } from "@/lib/validation/parse";
import { accessRequestStore } from "@/lib/access-requests/store";
import { withRlsContext } from "@/lib/db/rls-context";
import type { UserRole } from "@/types/tenant";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  roles: z.array(z.string()).min(1),
  /** Target union — required when platform_admin has no session union. */
  unionId: z.string().min(1).optional(),
  localId: z.string().optional(),
  localNumber: z.string().min(1).max(32).optional(),
  localSubText: z.string().max(200).optional(),
  collectionCode: z.string().min(1).max(32).optional(),
  collectionName: z.string().min(1).max(200).optional(),
  divisionId: z.string().optional(),
  bargainingUnitId: z.string().optional(),
  /** platform_admin may create a new union (“Other / Enter Union”). */
  newUnionName: z.string().min(1).max(200).optional(),
  /** When true, attempt transactional invite email after create (R3). */
  sendEmail: z.boolean().optional(),
  /** Optional reviewed beta request being fulfilled by this invitation. */
  requestId: z.string().min(1).optional(),
});

function inviteEmailKind(
  roles: string[],
): "officer" | "member" | "president" {
  if (roles.includes("local_president")) return "president";
  if (roles.every((r) => r === "local_member")) return "member";
  return "officer";
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  const roles = actor.roles;
  const isPlatform = roles.includes("platform_admin");
  const elevateLocal = canElevateLocalNumber(roles);
  const sessionUnionId = session.user.unionId ?? null;

  if (!sessionUnionId && !isPlatform) {
    return NextResponse.json({ error: "Missing union context" }, { status: 400 });
  }

  const canManageLocal = Boolean(
    sessionUnionId &&
      session.user.localId &&
      decideCapability(actor, "memberships.manage", {
        unionId: sessionUnionId,
        localId: session.user.localId,
      }).allowed,
  );
  if (!elevateLocal && !canManageLocal) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await hydrateTenantOverlayFromPostgres();

  const url = new URL(req.url);
  const queryUnionId = url.searchParams.get("unionId");
  const effectiveUnionId =
    isPlatform && queryUnionId
      ? queryUnionId
      : sessionUnionId;

  const seeds = getAllTenantSeeds();
  const unionsList = isPlatform
    ? seeds.map((s) => ({ id: s.union.id, name: s.union.name }))
    : [];

  if (!effectiveUnionId) {
    return NextResponse.json({
      invites: [],
      locals: [],
      subGroups: [],
      unions: unionsList,
      inviteRoles: inviteRolesForActor(roles),
      canInvitePresident: elevateLocal,
      canElevateLocalNumber: elevateLocal,
      isPlatformAdmin: isPlatform,
      sessionLocalId: session.user.localId ?? null,
      sessionUnionId: null,
      unionName: null,
    });
  }

  const ctx = getTenantContext(effectiveUnionId);
  if (!ctx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const scopeLocalId =
    elevateLocal || isPlatform ? undefined : session.user.localId;
  const invites = await listInvitesForUnion({
    unionId: effectiveUnionId,
    localId: scopeLocalId,
  });

  const allLocals = isPlatform
    ? seeds.flatMap((s) =>
        (s.locals?.length
          ? s.locals
          : s.local
            ? [s.local]
            : []
        ).map((local) => ({
          id: local.id,
          localNumber: local.localNumber,
          subText: local.subText,
          unionId: s.union.id,
        })),
      )
    : ctx.locals.map((local) => ({
        id: local.id,
        localNumber: local.localNumber,
        subText: local.subText,
        unionId: effectiveUnionId,
      }));

  const allSubGroups = isPlatform
    ? seeds.flatMap((s) =>
        (s.bargainingUnits ?? []).map((bu) => ({
          id: bu.id,
          code: bu.code,
          name: bu.name,
          localId: bu.localId,
        })),
      )
    : ctx.bargainingUnits.map((bu) => ({
        id: bu.id,
        code: bu.code,
        name: bu.name,
        localId: bu.localId,
      }));

  return NextResponse.json({
    invites: invites.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      roles: row.roles,
      status: row.status,
      localId: row.localId,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      ...(row.status === "pending"
        ? {
            token: row.token,
            acceptPath: `/app/invite/${row.token}`,
          }
        : {}),
    })),
    locals: allLocals,
    subGroups: allSubGroups,
    unions: unionsList,
    inviteRoles: inviteRolesForActor(roles),
    canInvitePresident: elevateLocal,
    canElevateLocalNumber: elevateLocal,
    isPlatformAdmin: isPlatform,
    sessionLocalId: session.user.localId ?? null,
    sessionUnionId: sessionUnionId,
    selectedUnionId: effectiveUnionId,
    unionName: ctx.union.name,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  const roles = actor.roles;
  const isPlatform = roles.includes("platform_admin");
  const elevateLocal = canElevateLocalNumber(roles);
  const sessionUnionId = session.user.unionId ?? null;

  if (!sessionUnionId && !isPlatform) {
    return NextResponse.json({ error: "Missing union context" }, { status: 400 });
  }

  const canManageLocal = Boolean(
    sessionUnionId &&
      session.user.localId &&
      decideCapability(actor, "memberships.manage", {
        unionId: sessionUnionId,
        localId: session.user.localId,
      }).allowed,
  );
  if (!elevateLocal && !canManageLocal) {
    if (!session.user.localId) {
      return NextResponse.json(
        { error: "Missing local context" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(createSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  if (!canInviteRoles(roles, parsed.data.roles)) {
    return NextResponse.json({ error: "Forbidden roles" }, { status: 403 });
  }

  await hydrateTenantOverlayFromPostgres();

  let unionId = sessionUnionId ?? "";
  if (parsed.data.newUnionName?.trim()) {
    if (!isPlatform) {
      return NextResponse.json(
        { error: "Only platform admins can create a union" },
        { status: 403 },
      );
    }
    const seed = await createUnionDurable({
      name: parsed.data.newUnionName.trim(),
      localNumber: parsed.data.localNumber?.trim() || undefined,
      localSubText: parsed.data.localSubText,
    });
    unionId = seed.union.id;
  } else if (isPlatform && parsed.data.unionId) {
    unionId = parsed.data.unionId;
  } else if (!unionId) {
    return NextResponse.json(
      { error: "Choose a union or enter a new union name" },
      { status: 400 },
    );
  }

  const ctx = getTenantContext(unionId);
  if (!ctx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  let localId = parsed.data.localId;

  if (!elevateLocal) {
    localId = session.user.localId;
    if (!localId) {
      return NextResponse.json(
        { error: "Missing local context" },
        { status: 400 },
      );
    }
  } else if (parsed.data.localNumber?.trim()) {
    const { local } = await findOrCreateLocal({
      unionId,
      localNumber: parsed.data.localNumber,
      subText: parsed.data.localSubText,
      divisionId: parsed.data.divisionId ?? ctx.division?.id,
    });
    localId = local.id;
    if (parsed.data.collectionCode && parsed.data.collectionName) {
      const latest = getTenantContext(unionId);
      const existing = latest?.bargainingUnits.find(
        (u) =>
          u.localId === local.id &&
          u.code === parsed.data.collectionCode?.trim().toLowerCase(),
      );
      if (!existing) {
        await createCollectionDurable({
          unionId,
          localId: local.id,
          code: parsed.data.collectionCode,
          name: parsed.data.collectionName,
        });
      }
    }
  } else if (localId) {
    const latest = getTenantContext(unionId);
    if (!latest?.locals.some((l) => l.id === localId)) {
      return NextResponse.json({ error: "Local not found" }, { status: 404 });
    }
  } else {
    return NextResponse.json(
      { error: "Choose a local or enter a local number" },
      { status: 400 },
    );
  }

  const invite = await createInvite({
    email: parsed.data.email,
    name: parsed.data.name,
    unionId,
    localId,
    divisionId: parsed.data.divisionId ?? session.user.divisionId,
    bargainingUnitId:
      parsed.data.bargainingUnitId ?? session.user.bargainingUnitId,
    roles: parsed.data.roles as UserRole[],
    invitedById: session.user.id,
  });

  if (parsed.data.requestId && localId) {
    await withRlsContext(
      {
        userId: session.user.id,
        unionId,
        localId,
        mfaVerified: true,
        crossLocal: elevateLocal || isPlatform,
      },
      () =>
        accessRequestStore.update(parsed.data.requestId!, {
          inviteId: invite.id,
          status: "invited",
          unionId,
          localId,
          reviewedById: session.user.id,
        }),
    );
  }

  const acceptPath = `/app/invite/${invite.token}`;
  let emailSent: boolean | undefined;
  let emailReason: string | undefined;

  if (parsed.data.sendEmail === true) {
    const origin = new URL(req.url).origin;
    const acceptUrl = `${emailAppBaseUrl(origin)}${acceptPath}`;
    const copy = buildInviteAcceptEmail({
      inviteeName: invite.name,
      acceptUrl,
      expiresAt: invite.expiresAt,
      kind: inviteEmailKind(invite.roles),
    });
    const result = await sendTransactionalEmail({
      to: invite.email,
      subject: copy.subject,
      text: copy.text,
    });
    emailSent = result.ok;
    emailReason = result.ok ? undefined : result.reason;

    await auditLog.log({
      userId: session.user.id,
      action: result.ok ? "email.invite" : "email.invite_skipped",
      resourceType: "invite",
      resourceId: invite.id,
      unionId: invite.unionId,
      localId: invite.localId,
      metadata: {
        to: invite.email,
        ...(result.ok
          ? { messageId: result.messageId ?? "" }
          : { reason: result.reason }),
      },
    });
  }

  return NextResponse.json({
    id: invite.id,
    email: invite.email,
    expiresAt: invite.expiresAt,
    acceptPath,
    token: invite.token,
    localId: invite.localId,
    ...(parsed.data.sendEmail === true
      ? { emailSent, emailReason }
      : {}),
  });
}
