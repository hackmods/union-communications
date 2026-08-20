import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { auditLog } from "@/lib/audit/store";
import { createInvite, listInvitesForUnion } from "@/lib/auth/invites";
import {
  buildInviteAcceptEmail,
  emailAppBaseUrl,
} from "@/lib/email/messages";
import { sendTransactionalEmail } from "@/lib/email/send";
import {
  canInvitePresidents,
  canInviteRoles,
  canManageInvites,
  inviteRolesForActor,
} from "@/lib/tenant/access";
import { getTenantContext } from "@/lib/tenant/loader";
import {
  findOrCreateLocal,
  hydrateTenantOverlayFromPostgres,
  createCollectionDurable,
} from "@/lib/tenant/persist";
import { parseJsonBody } from "@/lib/validation/parse";
import type { UserRole } from "@/types/tenant";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  roles: z.array(z.string()).min(1),
  localId: z.string().optional(),
  localNumber: z.string().min(1).max(32).optional(),
  localSubText: z.string().max(200).optional(),
  collectionCode: z.string().min(1).max(32).optional(),
  collectionName: z.string().min(1).max(200).optional(),
  divisionId: z.string().optional(),
  bargainingUnitId: z.string().optional(),
  /** When true, attempt transactional invite email after create (R3). */
  sendEmail: z.boolean().optional(),
});

function inviteEmailKind(
  roles: string[],
): "officer" | "member" | "president" {
  if (roles.includes("local_president")) return "president";
  if (roles.every((r) => r === "local_member")) return "member";
  return "officer";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roles = session.user.roles ?? [];
  if (!canManageInvites(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.user.unionId) {
    return NextResponse.json({ error: "Missing union context" }, { status: 400 });
  }

  await hydrateTenantOverlayFromPostgres();
  const ctx = getTenantContext(session.user.unionId);
  if (!ctx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const scopeLocalId = canInvitePresidents(roles)
    ? undefined
    : session.user.localId;
  const invites = await listInvitesForUnion({
    unionId: session.user.unionId,
    localId: scopeLocalId,
  });

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
    })),
    locals: ctx.locals.map((local) => ({
      id: local.id,
      localNumber: local.localNumber,
      subText: local.subText,
    })),
    inviteRoles: inviteRolesForActor(roles),
    canInvitePresident: canInvitePresidents(roles),
    sessionLocalId: session.user.localId ?? null,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roles = session.user.roles ?? [];
  if (!canManageInvites(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.user.unionId) {
    return NextResponse.json({ error: "Missing union context" }, { status: 400 });
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
  const unionId = session.user.unionId;
  const ctx = getTenantContext(unionId);
  if (!ctx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const elevated = canInvitePresidents(roles);
  let localId = parsed.data.localId;

  if (!elevated) {
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
