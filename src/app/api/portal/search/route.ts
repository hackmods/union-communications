import { requirePortalSession } from "@/lib/portal/portal-session";
import { getPortalAdapter } from "@/lib/portal/adapter";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { portalJson } from "@/lib/portal/portal-json";

export async function GET(request: Request) {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session, actor } = authResult;
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const portal = await getPortalAdapter(rlsContextForActor(session, actor));
  const hits = await portal.search(
    session.user.unionId!,
    session.user.id,
    q,
  );
  return portalJson({ hits });
}
