import { NextResponse } from "next/server";
import type { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import {
  assertInformalLogView,
  requireInformalLogSession,
} from "@/lib/auth/informal-log-session";
import { canConvertInformalLog } from "@/lib/informal-log/access";
import { informalLogStore } from "@/lib/informal-log/store";
import { grievanceStore } from "@/lib/grievance/store";
import { getTenantContext } from "@/lib/tenant/loader";
import { parseJsonBody } from "@/lib/validation/parse";
import { convertInformalLogSchema } from "@/lib/validation/informal-log-convert";
import type { UserRole } from "@/types/tenant";

type ConvertEnrichment = z.infer<typeof convertInformalLogSchema>;

/**
 * Promote an informal discussion log into an intake-stage grievance.
 * Copies topic → category, summary → summary (+ optional enrichment body),
 * stamps convertedToGrievanceId, and seeds a note + member communication.
 * Formal CA deadlines start only after promotion to formal.
 */
export async function POST(
  request: Request,
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

  let enrichment: ConvertEnrichment = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const raw = await request.json().catch(() => ({}));
    const parsed = parseJsonBody(convertInformalLogSchema, raw ?? {});
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.issues },
        { status: 400 },
      );
    }
    enrichment = parsed.data;
  }

  const summary = enrichment.summary?.trim() || entry.summary;
  const intake = {
    what: enrichment.intake?.what ?? entry.summary,
    ...enrichment.intake,
  };

  const created = await grievanceStore.create(
    {
      memberPseudonym: entry.memberPseudonym,
      category: entry.topic,
      summary,
      workflowStage: "intake",
      grievanceType: enrichment.grievanceType,
      memberNames: enrichment.memberNames,
      intake,
      linkedSnippets: enrichment.linkedSnippets,
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
