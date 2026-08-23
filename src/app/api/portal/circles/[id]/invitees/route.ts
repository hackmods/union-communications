import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";
import { canAdminCircle } from "@/lib/portal/access";
import { listCircleInviteCandidates } from "@/lib/portal/circle-invitees";
import type { UserRole } from "@/types/tenant";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const unionId = session.user.unionId!;
  const detail = portalStore.getCircleDetail(unionId, session.user.id, id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAdminCircle(roles, detail.membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rosterIds = new Set(detail.roster.map((row) => row.userId));
  const invitees = (await listCircleInviteCandidates(unionId)).filter(
    (user) => !rosterIds.has(user.id),
  );
  return NextResponse.json({ invitees });
}
