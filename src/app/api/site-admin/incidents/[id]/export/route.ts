import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { platformIncidentAuditEvents, platformIncidents } from "@/lib/db/schema";
import {
  authorizeIncidentAdmin,
  consumeIncidentStepUp,
  noStoreJson,
  recordIncidentAction,
  requestId,
} from "@/lib/site-admin/incident-http";
import { incidentIdSchema } from "@/lib/site-admin/incident-validation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeIncidentAdmin();
  if (!authorization.ok) return authorization.response;
  const { id: incidentId } = await context.params;
  if (!incidentIdSchema.safeParse(incidentId).success) return noStoreJson({ error: "Incident not found." }, { status: 404 });
  const id = requestId();
  try {
    const consumed = await consumeIncidentStepUp({
      access: authorization.access,
      token: request.headers.get("x-incident-step-up"),
      action: "export",
      resourceId: incidentId,
      requestId: id,
    });
    if (!consumed) return noStoreJson({ error: "A fresh TOTP challenge is required to export this incident." }, { status: 403 });

    return await withRlsContext(authorization.access.rlsContext, async () => {
      const db = getDb();
      const [record] = await db.select().from(platformIncidents).where(eq(platformIncidents.id, incidentId)).limit(1);
      if (!record) {
        await db.insert(platformIncidentAuditEvents).values({
          id: randomUUID(), actorId: authorization.access.actorId, incidentId,
          requestId: id, action: "access_denied", outcome: "denied",
        });
        return noStoreJson({ error: "Incident not found." }, { status: 404 });
      }
      await recordIncidentAction({ access: authorization.access, requestId: id, incidentId, action: "exported" });
      const audit = await db.select().from(platformIncidentAuditEvents)
        .where(eq(platformIncidentAuditEvents.incidentId, incidentId))
        .orderBy(desc(platformIncidentAuditEvents.createdAt)).limit(500);
      const headers = new Headers({
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="incident-${incidentId}.json"`,
        "X-Request-Id": id,
      });
      return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), record, audit }, null, 2), { headers });
    });
  } catch {
    return noStoreJson({ error: "Could not export the incident record." }, { status: 503 });
  }
}
