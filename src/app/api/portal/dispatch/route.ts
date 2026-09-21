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
  const items = await portal.listDispatch(
    session.user.unionId!,
    session.user.id,
  );
  return portalJson({ items });
}

export async function PATCH(request: Request) {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session, actor } = authResult;
  const body = (await request.json()) as { ids?: string[]; all?: boolean };
  const portal = await getPortalAdapter(rlsContextForActor(session, actor));
  const n = await portal.markDispatchRead(
    session.user.unionId!,
    session.user.id,
    body.all ? undefined : body.ids,
  );
  return portalJson({ marked: n });
}
