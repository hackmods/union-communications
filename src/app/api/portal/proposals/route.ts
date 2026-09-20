import { requirePortalSession } from "@/lib/portal/portal-session";
import { getTenantContext } from "@/lib/tenant/loader";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { proposalsStore } from "@/lib/hub-governance/store";
import { portalJson } from "@/lib/portal/portal-json";

/**
 * Member-safe Local Portal feed of published proposal packages.
 * Only publication snapshots are returned — never union counters,
 * caucus notes, or package internals.
 */
export async function GET() {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson({ error: authResult.error }, { status: authResult.status });
  }
  const { session } = authResult;
  const tenant = getTenantContext(session.user.unionId!, session.user.localId);
  if (!tenant?.union.enabledModules.includes("proposals")) {
    return portalJson({ publications: [] });
  }

  const rlsCtx = rlsContextForSession(session) ?? {};
  const publications = await withRlsContext(rlsCtx, () =>
    proposalsStore.listPublications(
      session.user.unionId!,
      session.user.localId ?? undefined,
    ),
  );

  return portalJson({ publications });
}