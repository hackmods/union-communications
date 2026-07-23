import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertCanCreateDiscussionThread,
  assertDiscussionThreadView,
  listFiltersForDiscussionsSession,
  requireDiscussionsSession,
  tenantIdsForDiscussionsSession,
} from "@/lib/auth/discussions-session";
import { discussionsStore } from "@/lib/discussions/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createDiscussionThreadSchema } from "@/lib/validation/discussions";

export async function GET(request: Request) {
  const authResult = await requireDiscussionsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const filters = listFiltersForDiscussionsSession(session);
  const url = new URL(request.url);
  const grievanceId = url.searchParams.get("grievanceId") ?? undefined;
  const bumpingCaseId = url.searchParams.get("bumpingCaseId") ?? undefined;

  const items = await discussionsStore.listThreads({
    ...filters,
    grievanceId,
    bumpingCaseId,
  });

  const visible = [];
  for (const thread of items) {
    if (await assertDiscussionThreadView(session, thread)) {
      visible.push(thread);
    }
  }

  await auditLog.log({
    userId: session.user.id,
    action: "discussions.threads.list",
    resourceType: "discussion_thread",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ threads: visible });
}

export async function POST(request: Request) {
  const authResult = await requireDiscussionsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(createDiscussionThreadSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const createGate = await assertCanCreateDiscussionThread(session, {
    grievanceId: parsed.data.grievanceId,
    bumpingCaseId: parsed.data.bumpingCaseId,
  });
  if (!createGate.ok) {
    return NextResponse.json(
      { error: createGate.error },
      { status: createGate.status },
    );
  }

  const { unionId, localId } = tenantIdsForDiscussionsSession(session);
  const thread = await discussionsStore.createThread(parsed.data, {
    unionId,
    localId,
    createdById: session.user.id,
    createdByName: session.user.name ?? session.user.email ?? "Officer",
  });

  await auditLog.log({
    userId: session.user.id,
    action: "discussions.threads.create",
    resourceType: "discussion_thread",
    resourceId: thread.id,
    unionId,
    localId,
  });

  return NextResponse.json({ thread }, { status: 201 });
}
