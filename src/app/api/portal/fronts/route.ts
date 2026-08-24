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
  const fronts = portalStore.listFronts(
    session.user.unionId!,
    session.user.id,
  );
  return portalJson({ fronts });
}
