import { randomUUID } from "node:crypto";
import { desc } from "drizzle-orm";
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
import { platformIncidentCreateSchema } from "@/lib/site-admin/incident-validation";

/** GET /api/site-admin/incidents — requires a fresh action-bound TOTP grant. */
export async function GET(request: Request) {
  const authorization = await authorizeIncidentAdmin();
  if (!authorization.ok) return authorization.response;
  const id = requestId();
  try {
    const consumed = await consumeIncidentStepUp({
      access: authorization.access,
      token: request.headers.get("x-incident-step-up"),
      action: "view",
      requestId: id,
    });
    if (!consumed) return noStoreJson({ error: "A fresh TOTP challenge is required for this register view." }, { status: 403 });
    return await withRlsContext(authorization.access.rlsContext, async () => {
      await recordIncidentAction({ access: authorization.access, requestId: id, action: "viewed" });
      const db = getDb();
      const [records, events] = await Promise.all([
        db.select().from(platformIncidents).orderBy(desc(platformIncidents.updatedAt)).limit(250),
        db.select().from(platformIncidentAuditEvents).orderBy(desc(platformIncidentAuditEvents.createdAt)).limit(200),
      ]);
      return noStoreJson({ records, events }, { headers: { "X-Request-Id": id } });
    });
  } catch {
    return noStoreJson({ error: "Could not load the incident register." }, { status: 503 });
  }
}

/** POST /api/site-admin/incidents — create an incident after a fresh TOTP challenge. */
export async function POST(request: Request) {
  const authorization = await authorizeIncidentAdmin();
  if (!authorization.ok) return authorization.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 });
  }
  const token = request.headers.get("x-incident-step-up");
  const parsed = platformIncidentCreateSchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ error: "Check the incident fields and try again." }, { status: 400 });
  const id = requestId();
  const incidentId = randomUUID();
  try {
    const consumed = await consumeIncidentStepUp({
      access: authorization.access,
      token,
      action: "create",
      requestId: id,
    });
    if (!consumed) return noStoreJson({ error: "A fresh TOTP challenge is required to create an incident." }, { status: 403 });
    return await withRlsContext(authorization.access.rlsContext, async () => {
      const db = getDb();
      const [record] = await db.insert(platformIncidents).values({
        id: incidentId,
        ...parsed.data,
        closedAt: null,
        createdBy: authorization.access.actorId,
        updatedBy: authorization.access.actorId,
      }).returning();
      const event = await recordIncidentAction({ access: authorization.access, requestId: id, incidentId, action: "created" });
      return noStoreJson({ record, event }, { status: 201, headers: { "X-Request-Id": id } });
    });
  } catch {
    return noStoreJson({ error: "Could not save the incident record." }, { status: 503 });
  }
}
