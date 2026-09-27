import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
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
import { incidentIdSchema, platformIncidentUpdateSchema } from "@/lib/site-admin/incident-validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeIncidentAdmin();
  if (!authorization.ok) return authorization.response;
  const { id: incidentId } = await context.params;
  if (!incidentIdSchema.safeParse(incidentId).success) return noStoreJson({ error: "Incident not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = platformIncidentUpdateSchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ error: "Check the incident fields and try again." }, { status: 400 });
  const auditRequestId = requestId();
  try {
    const consumed = await consumeIncidentStepUp({
      access: authorization.access,
      token: request.headers.get("x-incident-step-up"),
      action: "update",
      resourceId: incidentId,
      requestId: auditRequestId,
    });
    if (!consumed) return noStoreJson({ error: "A fresh TOTP challenge is required to update this incident." }, { status: 403 });

    return await withRlsContext(authorization.access.rlsContext, async () => {
      const db = getDb();
      const [current] = await db.select().from(platformIncidents).where(eq(platformIncidents.id, incidentId)).for("update").limit(1);
      if (!current) {
        await db.insert(platformIncidentAuditEvents).values({
          id: randomUUID(), actorId: authorization.access.actorId, incidentId,
          requestId: auditRequestId, action: "access_denied", outcome: "denied",
        });
        return noStoreJson({ error: "Incident not found." }, { status: 404 });
      }
      const now = new Date();
      const [record] = await db.update(platformIncidents).set({
        ...parsed.data,
        closedAt: parsed.data.status === "closed" ? current.closedAt ?? now : null,
        updatedBy: authorization.access.actorId,
        updatedAt: now,
      }).where(eq(platformIncidents.id, incidentId)).returning();
      const action = current.status !== "closed" && record.status === "closed"
        ? "closed"
        : current.status === "closed" && record.status !== "closed"
          ? "reopened"
          : "updated";
      const event = await recordIncidentAction({ access: authorization.access, requestId: auditRequestId, incidentId, action });
      return noStoreJson({ record, event }, { headers: { "X-Request-Id": auditRequestId } });
    });
  } catch {
    return noStoreJson({ error: "Could not update the incident record." }, { status: 503 });
  }
}
