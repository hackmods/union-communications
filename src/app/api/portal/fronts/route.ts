import { requirePortalSession } from "@/lib/portal/portal-session";
import { getPortalAdapter } from "@/lib/portal/adapter";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { portalJson } from "@/lib/portal/portal-json";

export async function GET() {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session, actor } = authResult;
  const portal = await getPortalAdapter(rlsContextForActor(session, actor));
  const fronts = await portal.listFronts(
    session.user.unionId!,
    session.user.id,
  );
  return portalJson({ fronts });
}
