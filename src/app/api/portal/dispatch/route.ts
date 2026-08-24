import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";
import { portalJson } from "@/lib/portal/portal-json";

export async function GET() {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const items = portalStore.listDispatch(
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
  const { session } = authResult;
  const body = (await request.json()) as { ids?: string[]; all?: boolean };
  const n = portalStore.markDispatchRead(
    session.user.unionId!,
    session.user.id,
    body.all ? undefined : body.ids,
  );
  return portalJson({ marked: n });
}
