import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability } from "@/lib/authorization/model";
import { withRlsContext } from "@/lib/db/rls-context";
import { accessRequestStore } from "@/lib/access-requests/store";
import { accessRequestMemberView } from "@/types/access-request";
import { z } from "zod";

const schema = z
  .object({
    status: z
      .enum(["reviewing", "approved", "invited", "completed", "declined"])
      .optional(),
    privateNote: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

async function authorize(id: string) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false as const, status: 403 as const, error: "MFA required" };
  }
  const actor = await resolveAuthorizationActor(session);
  const isPlatformAdmin = (session.user.roles ?? []).includes("platform_admin");
  const unionId = session.user.unionId;
  const localId = actor.activeLocalId ?? session.user.localId;

  const row = await withRlsContext(
    {
      userId: session.user.id,
      unionId: unionId ?? undefined,
      localId: localId ?? undefined,
      mfaVerified: true,
      crossLocal: isPlatformAdmin,
    },
    () => accessRequestStore.getById(id),
  );
  if (!row) {
    return { ok: false as const, status: 404 as const, error: "Not found" };
  }

  if (isPlatformAdmin) {
    return { ok: true as const, session, actor, row, unionId, localId, isPlatformAdmin };
  }

  if (
    !unionId ||
    !localId ||
    !decideCapability(actor, "memberships.manage", { unionId, localId }).allowed ||
    row.kind !== "member_access" ||
    row.unionId !== unionId ||
    row.localId !== localId
  ) {
    return { ok: false as const, status: 404 as const, error: "Not found" };
  }

  return { ok: true as const, session, actor, row, unionId, localId, isPlatformAdmin };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authz = await authorize(id);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  return NextResponse.json({
    item: authz.isPlatformAdmin ? authz.row : accessRequestMemberView(authz.row),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authz = await authorize(id);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const updated = await withRlsContext(
    {
      userId: authz.session.user.id,
      unionId: authz.unionId ?? authz.row.unionId ?? undefined,
      localId: authz.localId ?? authz.row.localId ?? undefined,
      mfaVerified: true,
      crossLocal: authz.isPlatformAdmin,
    },
    () =>
      accessRequestStore.update(authz.row.id, {
        ...parsed.data,
        reviewedById: authz.session.user.id,
      }),
  );
  return NextResponse.json({
    item: updated
      ? authz.isPlatformAdmin
        ? updated
        : accessRequestMemberView(updated)
      : null,
  });
}
