import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { grievanceAttachmentShares, grievanceMemberUpdates } from "@/lib/db/schema";
import { grievanceStore } from "@/lib/grievance/store";
import { grievanceDbBackend } from "@/lib/db/backend";
import { getCurrentStepDueDate } from "@/lib/grievance/deadlines";
import { resolveGrievanceConfig } from "@/lib/tenant/loader";
import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalJson } from "@/lib/portal/portal-json";
import { getTenantContext } from "@/lib/tenant/loader";
import { projectMemberSafeGrievance } from "@/lib/grievance/member-safe-projection";

/** Member-only, allowlisted projection. Internal case relations are never read here. */
export async function GET() {
  const authResult = await requirePortalSession();
  if (!authResult.ok) return portalJson({ error: authResult.error }, { status: authResult.status });
  const { session, actor } = authResult;
  const unionId = session.user.unionId;
  if (!unionId) return portalJson({ cases: [] });
  const tenant = getTenantContext(unionId, session.user.localId);
  if (!tenant?.union.enabledModules.includes("grievance")) {
    return portalJson({ error: "Grievance module disabled" }, { status: 403 });
  }

  const activeMemberships = actor.memberships.filter((membership) => membership.unionId === unionId);
  const cases = [];
  for (const membership of activeMemberships) {
    const rls = { unionId, localId: membership.localId, userId: session.user.id, crossLocal: false };
    const grievances = await withRlsContext(rls, () => grievanceStore.list({
      unionId,
      localId: membership.localId,
      memberUserId: session.user.id,
    }));
    for (const grievance of grievances) {
      const dueConfig = resolveGrievanceConfig(unionId, {
        localId: grievance.localId,
        bargainingUnitId: grievance.bargainingUnitId,
      });
      const dueAt = dueConfig
        ? getCurrentStepDueDate(grievance.filedAt, grievance.currentStep, dueConfig)?.toISOString() ?? null
        : null;
      let updates: Array<{ id: string; body: string; publishedAt: string }> = [];
      let attachments: Array<{ id: string }> = [];
      if (isPostgresConfigured() && grievanceDbBackend() === "postgres") {
        const shared = await withRlsContext(rls, async () => {
          const db = getDb();
          const [updateRows, attachmentRows] = await Promise.all([
            db.select({ id: grievanceMemberUpdates.id, body: grievanceMemberUpdates.body, publishedAt: grievanceMemberUpdates.publishedAt })
              .from(grievanceMemberUpdates)
              .where(and(eq(grievanceMemberUpdates.grievanceId, grievance.id), isNull(grievanceMemberUpdates.withdrawnAt)))
              .orderBy(asc(grievanceMemberUpdates.publishedAt)),
            db.select({ id: grievanceAttachmentShares.attachmentId })
              .from(grievanceAttachmentShares)
              .where(and(eq(grievanceAttachmentShares.grievanceId, grievance.id), isNull(grievanceAttachmentShares.revokedAt))),
          ]);
          return { updateRows, attachmentRows };
        });
        updates = shared.updateRows.map((row) => ({ id: row.id, body: row.body, publishedAt: row.publishedAt.toISOString() }));
        attachments = shared.attachmentRows.map((row) => ({ id: row.id }));
      }
      cases.push(projectMemberSafeGrievance({
        grievance,
        dueAt,
        updates,
        attachments,
      }));
    }
  }
  cases.sort((a, b) => b.filedAt.localeCompare(a.filedAt));
  return portalJson({ cases });
}
