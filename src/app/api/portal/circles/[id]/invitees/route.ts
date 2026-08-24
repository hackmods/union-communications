import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";
import { canAdminCircle } from "@/lib/portal/access";
import { listCircleInviteCandidates } from "@/lib/portal/circle-invitees";
import { portalJson } from "@/lib/portal/portal-json";
import type { UserRole } from "@/types/tenant";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const unionId = session.user.unionId!;
  const detail = portalStore.getCircleDetail(unionId, session.user.id, id);
  if (!detail) {
    return portalJson({ error: "Not found" }, { status: 404 });
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAdminCircle(roles, detail.membership.role)) {
    return portalJson({ error: "Forbidden" }, { status: 403 });
  }
  const rosterIds = new Set(detail.roster.map((row) => row.userId));
  const invitees = (await listCircleInviteCandidates(unionId)).filter(
    (user) => !rosterIds.has(user.id),
  );
  return portalJson({ invitees });
}
