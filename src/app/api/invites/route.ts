import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";
import { auditDbBackend } from "@/lib/db/backend";
import { verifyFreshMfaStepUp } from "@/lib/auth/fresh-mfa-step-up";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { createInvite, listInvitesForUnion } from "@/lib/auth/invites";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import {
  buildInviteAcceptEmail,
  emailAppBaseUrl,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  canInviteAcrossUnionLocals,
  canInviteRoles,
  canManageInvites,
  inviteRolesForActor,
} from "@/lib/tenant/access";
import {
  canElevateLocalNumber,
} from "@/lib/tenant/local-number-access";
import {
  findLocalByNumber,
  getTenantContext,
  getAllTenantSeeds,
} from "@/lib/tenant/loader";
import { isSampleDemoLocal } from "@/lib/tenant/sample-demo";
import {
  findOrCreateLocal,
  hydrateTenantOverlayFromPostgres,
  createCollectionDurable,
  createUnionDurable,
  tenantsPostgresEnabled,
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
  /** Fresh TOTP challenge required when this request creates a union. */
  mfaCode: z.string().max(32).optional(),
});

function inviteEmailKind(
  roles: string[],
): "officer" | "member" | "president" {
  if (roles.includes("local_president")) return "president";
  if (roles.every((r) => r === "local_member")) return "member";
  return "officer";
}

function emptyInvitesPayload(input: {
  roles: string[];
  elevateLocal: boolean;
  isPlatform: boolean;
  sessionLocalId: string | null;
  sessionUnionId: string | null;
  unions: Array<{ id: string; name: string; isSample?: boolean }>;
  locals?: Array<{
    id: string;
    localNumber: string;
    subText?: string;
    unionId: string;
    divisionId?: string;
    isSample?: boolean;
  }>;
  collectives?: Array<{
    id: string;
    unionId: string;
    code: string;
    name: string;
  }>;
  subGroups?: Array<{
    id: string;
    code: string;
    name: string;
    localId?: string;
  }>;
}) {
  return {
    invites: [],
    locals: input.locals ?? [],
    collectives: input.collectives ?? [],
    subGroups: input.subGroups ?? [],
    unions: input.unions,
    inviteRoles: inviteRolesForActor(input.roles),
    canInvitePresident: input.elevateLocal,
    canElevateLocalNumber: input.elevateLocal,
    isPlatformAdmin: input.isPlatform,
    sessionLocalId: input.sessionLocalId,
    sessionUnionId: input.sessionUnionId,
    selectedUnionId: null as string | null,
    unionName: null as string | null,
  };
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
  const crossLocal = canInviteAcrossUnionLocals(roles);
  const sessionUnionId = session.user.unionId ?? null;

  // Match the invites page + email resend route: Hub invite managers are
  // role-gated. Do not require local_memberships / officer_assignments rows —
  // seed-admin and pre-authorization accounts often lack them, which 403'd the
  // board on load while the page still rendered (canManageInvites only).
  if (!canManageInvites(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!sessionUnionId && !isPlatform) {
    return NextResponse.json({ error: "Missing union context" }, { status: 400 });
  }

  // Presidents / division admins stay session-local — never widen to the union.
  if (!crossLocal && !session.user.localId) {
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
    ? seeds.map((s) => ({
        id: s.union.id,
        name: s.union.name,
        isSample: isSampleDemoLocal({
          unionId: s.union.id,
          unionSlug: s.union.slug,
        }),
      }))
    : [];
  const platformLocals = isPlatform
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
          divisionId: local.divisionId,
          isSample: isSampleDemoLocal({
            unionId: s.union.id,
            unionSlug: s.union.slug,
          }),
        })),
      )
    : [];
  const platformCollectives = isPlatform
    ? seeds.flatMap((s) =>
        (s.divisions ?? (s.division ? [s.division] : [])).map((division) => ({
          id: division.id,
          unionId: s.union.id,
          code: division.code,
          name: division.name,
        })),
      )
    : [];
  const platformSubGroups = isPlatform
    ? seeds.flatMap((s) =>
        (s.bargainingUnits ?? []).map((bu) => ({
          id: bu.id,
          code: bu.code,
          name: bu.name,
          localId: bu.localId,
        })),
      )
    : [];

  if (!effectiveUnionId) {
    return NextResponse.json(
      emptyInvitesPayload({
        roles,
        elevateLocal,
        isPlatform,
        sessionLocalId: session.user.localId ?? null,
        sessionUnionId: null,
        unions: unionsList,
        locals: platformLocals,
        collectives: platformCollectives,
        subGroups: platformSubGroups,
      }),
    );
  }

  const ctx = getTenantContext(effectiveUnionId);
  if (!ctx) {
    // Orphaned session union (e.g. demo purge) must not hard-fail the board for
    // elevated operators — they still need the empty composer + union picker.
    if (crossLocal || isPlatform) {
      return NextResponse.json(
        emptyInvitesPayload({
          roles,
          elevateLocal,
          isPlatform,
          sessionLocalId: session.user.localId ?? null,
          sessionUnionId,
          unions: unionsList,
          locals: platformLocals,
          collectives: platformCollectives,
          subGroups: platformSubGroups,
        }),
      );
    }
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const scopeLocalId = crossLocal ? undefined : session.user.localId;
  const invites = await listInvitesForUnion({
    unionId: effectiveUnionId,
    localId: scopeLocalId,
  });

  const allLocals = isPlatform
    ? platformLocals
    : ctx.locals.map((local) => ({
        id: local.id,
        localNumber: local.localNumber,
        subText: local.subText,
        unionId: effectiveUnionId,
        divisionId: local.divisionId,
        isSample: isSampleDemoLocal({
          unionId: effectiveUnionId,
          unionSlug: ctx.union.slug,
        }),
      }));

  const allCollectives = isPlatform
    ? platformCollectives
    : ctx.divisions.map((division) => ({
        id: division.id,
        unionId: effectiveUnionId,
        code: division.code,
        name: division.name,
      }));

  const allSubGroups = isPlatform
    ? platformSubGroups
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
    collectives: allCollectives,
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
  const correlation = createAuditRequestContext();
  const respond = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: correlation.responseHeaders({ "Cache-Control": "private, no-store" }),
    });
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  const roles = actor.roles;
  const isPlatform = roles.includes("platform_admin");
  const elevateLocal = canElevateLocalNumber(roles);
  const crossLocal = canInviteAcrossUnionLocals(roles);
  const sessionUnionId = session.user.unionId ?? null;

  if (!canManageInvites(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!sessionUnionId && !isPlatform) {
    return NextResponse.json({ error: "Missing union context" }, { status: 400 });
  }

  if (!crossLocal && !session.user.localId) {
    return NextResponse.json(
      { error: "Missing local context" },
      { status: 400 },
    );
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

  const creatingUnion = Boolean(parsed.data.newUnionName?.trim());
  if (creatingUnion && !isPlatform) {
    return respond({ error: "Only platform admins can create a union" }, 403);
  }
  if (creatingUnion && !parsed.data.localNumber?.trim()) {
    return respond(
      { error: "A local number is required when creating a union invitation." },
      400,
    );
  }

  const auditProvision = (
    outcome: "success" | "denied" | "error",
    resourceId: string,
    metadata: Record<string, string>,
    unionId?: string,
    localId?: string,
  ) => auditLog.log({
    userId: session.user.id,
    action: "tenant.union.provision",
    resourceType: "tenant",
    resourceId,
    ...(unionId ? { unionId } : {}),
    ...(localId ? { localId } : {}),
    outcome,
    requestId: correlation.requestId,
    metadata,
  });
  const uncertainUnionResult = async () => {
    await auditProvision("error", "provision-result", {
      phase: "provision_result_unconfirmed",
    }).catch(() => undefined);
    return respond(
      {
        error: "The union or invitation may have been created, but its result could not be confirmed. Reload the union list and invitations before retrying.",
        code: "union_result_unconfirmed",
      },
      503,
    );
  };

  if (creatingUnion) {
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
      userId: session.user.id,
      code: parsed.data.mfaCode,
    });
    if (!challenge.ok) {
      try {
        await auditProvision(challenge.outcome, "provision-request", {
          reason: `mfa_step_up_${challenge.code}`,
        });
      } catch {
        return respond({ error: "Audit service unavailable", code: "audit_unavailable" }, 503);
      }
      const headers = new Headers();
      if (challenge.retryAfterSeconds) headers.set("Retry-After", String(challenge.retryAfterSeconds));
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
      await auditProvision("success", "provision-request", { phase: "provision_authorized" });
    } catch {
      return respond(
        {
          error: "The union was not created because its authorization audit could not be confirmed.",
          code: "audit_unavailable",
        },
        503,
      );
    }
  }

  await hydrateTenantOverlayFromPostgres();

  let unionId = sessionUnionId ?? "";
  let provisionedUnion: { id: string } | undefined;
  if (creatingUnion) {
    try {
      const seed = await createUnionDurable({
        name: parsed.data.newUnionName!.trim(),
        localNumber: parsed.data.localNumber!.trim(),
        localSubText: parsed.data.localSubText,
      });
      unionId = seed.union.id;
      provisionedUnion = { id: seed.union.id };
    } catch {
      return uncertainUnionResult();
    }
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
    return provisionedUnion
      ? uncertainUnionResult()
      : NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  let localId = parsed.data.localId;

  if (!crossLocal) {
    localId = session.user.localId;
    if (!localId) {
      return provisionedUnion
        ? uncertainUnionResult()
        : NextResponse.json({ error: "Missing local context" }, { status: 400 });
    }
  } else if (parsed.data.localNumber?.trim()) {
    if (elevateLocal) {
      let local: Awaited<ReturnType<typeof findOrCreateLocal>>["local"];
      try {
        ({ local } = await findOrCreateLocal({
          unionId,
          localNumber: parsed.data.localNumber,
          subText: parsed.data.localSubText,
          // Explicit selection only — never inherit the tenant's first collective.
          ...(parsed.data.divisionId ? { divisionId: parsed.data.divisionId } : {}),
        }));
      } catch (err) {
        if (provisionedUnion) return uncertainUnionResult();
        throw err;
      }
      localId = local.id;
      if (parsed.data.collectionCode && parsed.data.collectionName) {
        const latest = getTenantContext(unionId);
        const existing = latest?.bargainingUnits.find(
          (u) =>
            u.localId === local.id &&
            u.code === parsed.data.collectionCode?.trim().toLowerCase(),
        );
        if (!existing) {
          try {
            await createCollectionDurable({
              unionId,
              localId: local.id,
              code: parsed.data.collectionCode,
              name: parsed.data.collectionName,
            });
          } catch (err) {
            if (provisionedUnion) return uncertainUnionResult();
            throw err;
          }
        }
      }
    } else {
      const existing = findLocalByNumber(unionId, parsed.data.localNumber);
      if (!existing) {
        return provisionedUnion
          ? uncertainUnionResult()
          : NextResponse.json(
              { error: "Local not found. Ask a site admin to create that local number." },
              { status: 404 },
            );
      }
      localId = existing.id;
    }
  } else if (localId) {
    const latest = getTenantContext(unionId);
    if (!latest?.locals.some((l) => l.id === localId)) {
      return provisionedUnion
        ? uncertainUnionResult()
        : NextResponse.json({ error: "Local not found" }, { status: 404 });
    }
  } else {
    return provisionedUnion
      ? uncertainUnionResult()
      : NextResponse.json({ error: "Choose a local or enter a local number" }, { status: 400 });
  }

  const inviteLocal = localId
    ? getTenantContext(unionId)?.locals.find((l) => l.id === localId)
    : undefined;
  let invite: Awaited<ReturnType<typeof createInvite>>;
  try {
    invite = await createInvite({
      email: parsed.data.email,
      name: parsed.data.name,
      unionId,
      localId,
      divisionId:
        parsed.data.divisionId ||
        inviteLocal?.divisionId ||
        session.user.divisionId,
      bargainingUnitId:
        parsed.data.bargainingUnitId ?? session.user.bargainingUnitId,
      roles: parsed.data.roles as UserRole[],
      invitedById: session.user.id,
    });
  } catch (err) {
    if (provisionedUnion) return uncertainUnionResult();
    throw err;
  }

  if (parsed.data.requestId && localId) {
    try {
      await withRlsContext(
        {
          userId: session.user.id,
          unionId,
          localId,
          mfaVerified: true,
          crossLocal: crossLocal || isPlatform,
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
    } catch (err) {
      if (provisionedUnion) return uncertainUnionResult();
      throw err;
    }
  }

  const acceptPath = `/app/invite/${invite.token}`;
  let emailSent: boolean | undefined;
  let emailReason: string | undefined;

  if (parsed.data.sendEmail === true) {
    try {
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
    } catch (err) {
      if (provisionedUnion) return uncertainUnionResult();
      throw err;
    }
  }

  if (provisionedUnion) {
    try {
      await auditProvision(
        "success",
        provisionedUnion.id,
        { phase: "provision_result", inviteCreated: "true" },
        provisionedUnion.id,
        localId,
      );
    } catch {
      return uncertainUnionResult();
    }
  }

  return respond({
    id: invite.id,
    unionId: invite.unionId,
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
