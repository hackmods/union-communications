import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertPollView,
  requirePollsSession,
} from "@/lib/auth/polls-session";
import { canMutatePolls } from "@/lib/polls/access";
import { pollsStore } from "@/lib/polls/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updatePollSchema } from "@/lib/validation/polls";
import type { UserRole } from "@/types/tenant";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requirePollsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { id } = await context.params;
  const poll = await pollsStore.getById(id);
  if (!poll || !assertPollView(session, poll)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const aggregates = await pollsStore.aggregates(id);

  await auditLog.log({
    userId: session.user.id,
    action: "polls.view",
    resourceType: "poll_definition",
    resourceId: poll.id,
    unionId: poll.unionId,
    localId: poll.localId,
  });

  return NextResponse.json({ poll, aggregates });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requirePollsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canMutatePolls(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await pollsStore.getById(id);
  if (!existing || !assertPollView(session, existing)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(updatePollSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const poll = await pollsStore.update(id, parsed.data);
  if (!poll) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "polls.update",
    resourceType: "poll_definition",
    resourceId: poll.id,
    unionId: poll.unionId,
    localId: poll.localId,
  });

  return NextResponse.json({ poll });
}
