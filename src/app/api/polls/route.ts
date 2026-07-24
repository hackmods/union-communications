import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  listFiltersForPollsSession,
  requirePollsSession,
  tenantIdsForPollsSession,
} from "@/lib/auth/polls-session";
import { canMutatePolls } from "@/lib/polls/access";
import { pollsStore } from "@/lib/polls/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { createPollSchema } from "@/lib/validation/polls";
import type { PollStatus } from "@/types/polls";
import type { UserRole } from "@/types/tenant";

export async function GET(request: Request) {
  const authResult = await requirePollsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "open" || statusParam === "closed"
      ? (statusParam as PollStatus)
      : undefined;
  const filters = listFiltersForPollsSession(session);
  const polls = await pollsStore.list({ ...filters, status });

  await auditLog.log({
    userId: session.user.id,
    action: "polls.list",
    resourceType: "poll_definition",
    resourceId: "*",
    unionId: filters.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ polls });
}

export async function POST(request: Request) {
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

  if (!session.user.localId) {
    return NextResponse.json({ error: "Local required" }, { status: 400 });
  }

  const raw = await request.json();
  const parsed = parseJsonBody(createPollSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const tenant = tenantIdsForPollsSession(session);
  try {
    const poll = await pollsStore.create(parsed.data, {
      unionId: tenant.unionId,
      localId: tenant.localId,
      createdById: session.user.id,
    });

    await auditLog.log({
      userId: session.user.id,
      action: "polls.create",
      resourceType: "poll_definition",
      resourceId: poll.id,
      unionId: poll.unionId,
      localId: poll.localId,
    });

    return NextResponse.json({ poll }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    if (message.includes("Slug already")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
