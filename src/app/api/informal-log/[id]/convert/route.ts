import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertInformalLogView,
  requireInformalLogSession,
} from "@/lib/auth/informal-log-session";
import { canConvertInformalLog } from "@/lib/informal-log/access";
import { informalLogStore } from "@/lib/informal-log/store";
import { grievanceStore } from "@/lib/grievance/store";
import { getTenantContext } from "@/lib/tenant/loader";
import type { UserRole } from "@/types/tenant";

/**
 * Promote an informal discussion log into a Step 1 grievance.
 * Copies topic → category, memberPseudonym, stamps convertedToGrievanceId,
 * and seeds a note + member communication from the log summary/channel.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInformalLogSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canConvertInformalLog(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenant = session.user.unionId
    ? getTenantContext(session.user.unionId)
    : null;
  if (!tenant?.union.enabledModules.includes("grievance")) {
    return NextResponse.json(
      { error: "Grievance module not enabled" },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const entry = await informalLogStore.getById(id);
  if (!entry || !assertInformalLogView(session, entry)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (entry.convertedToGrievanceId) {
    return NextResponse.json(
      {
        error: "Already converted",
        grievanceId: entry.convertedToGrievanceId,
      },
      { status: 409 },
    );
  }

  const created = await grievanceStore.create(
    {
      memberPseudonym: entry.memberPseudonym,
      category: entry.topic,
      filedAt: new Date().toISOString(),
      assignedStewardId: session.user.id,
      bargainingUnitId: entry.bargainingUnitId,
    },
    {
      unionId: entry.unionId,
      localId: entry.localId,
      bargainingUnitId: entry.bargainingUnitId,
      createdById: session.user.id,
      assignedStewardId: session.user.id,
    },
  );

  const grievanceId = created.grievance.id;
  const authorName = session.user.name ?? session.user.email ?? "Officer";
  await grievanceStore.addNote(
    grievanceId,
    {
      body: `Converted from informal log (${entry.occurredAt.slice(0, 10)}).\n\n${entry.summary}`,
    },
    { authorId: session.user.id, authorName },
  );

  await grievanceStore.addCommunication(
    grievanceId,
    {
      channel: entry.channel,
      direction: "outbound",
      summary: entry.summary,
      occurredAt: entry.occurredAt,
    },
    {
      unionId: entry.unionId,
      localId: entry.localId,
      loggedById: entry.loggedById,
      loggedByName: entry.loggedByName,
    },
  );

  const updated = await informalLogStore.update(entry.id, {
    convertedToGrievanceId: grievanceId,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "informal_log.convert",
    resourceType: "informal_log_entry",
    resourceId: entry.id,
    unionId: entry.unionId,
    localId: entry.localId,
  });

  return NextResponse.json(
    { entry: updated, grievance: created.grievance },
    { status: 201 },
  );
}
