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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }
  const actor = await resolveAuthorizationActor(session);
  const unionId = session.user.unionId;
  const localId = actor.activeLocalId ?? session.user.localId;
  if (
    !localId ||
    !unionId ||
    !decideCapability(actor, "memberships.manage", { unionId, localId }).allowed
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const row = await withRlsContext(
    {
      userId: session.user.id,
      unionId,
      localId,
      mfaVerified: true,
    },
    () => accessRequestStore.getById(id),
  );
  if (!row || row.kind !== "member_access") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
      userId: session.user.id,
      unionId,
      localId,
      mfaVerified: true,
    },
    () =>
      accessRequestStore.update(row.id, {
        ...parsed.data,
        reviewedById: session.user.id,
      }),
  );
  return NextResponse.json({
    item: updated ? accessRequestMemberView(updated) : null,
  });
}
