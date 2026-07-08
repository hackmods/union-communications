import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  listFiltersForBumpingSession,
  requireBumpingSession,
} from "@/lib/auth/bumping-session";
import { canWriteBumping } from "@/lib/bumping/access";
import { bumpingStore } from "@/lib/bumping/memory-adapter";
import type { UserRole } from "@/types/tenant";

export async function GET() {
  const authResult = await requireBumpingSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const filters = listFiltersForBumpingSession(session);
  const cases = await bumpingStore.list(filters);

  await auditLog.log({
    userId: session.user.id,
    action: "bumping.list",
    resourceType: "bumping_case",
    resourceId: "*",
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ cases });
}

export async function POST(request: Request) {
  const authResult = await requireBumpingSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canWriteBumping(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    memberRef,
    seniorityDate,
    currentPosition,
    targetPosition,
    scenario,
    incumbentPosition,
    bumpingPosition,
  } = body;

  if (
    !memberRef ||
    !seniorityDate ||
    !currentPosition ||
    !targetPosition ||
    !scenario
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const unionId = session.user.unionId;
  const localId = session.user.localId;
  if (!unionId || !localId) {
    return NextResponse.json(
      { error: "Union and local context required" },
      { status: 400 },
    );
  }

  const created = await bumpingStore.create(
    {
      memberRef,
      seniorityDate,
      currentPosition,
      targetPosition,
      scenario,
      incumbentPosition: incumbentPosition ?? {
        title: "",
        duties: "",
        qualifications: "",
        seniorityNotes: "",
      },
      bumpingPosition: bumpingPosition ?? {
        title: "",
        duties: "",
        qualifications: "",
        seniorityNotes: "",
      },
    },
    {
      unionId,
      localId,
      createdById: session.user.id,
    },
  );

  await auditLog.log({
    userId: session.user.id,
    action: "bumping.create",
    resourceType: "bumping_case",
    resourceId: created.bumpingCase.id,
    unionId,
    localId,
  });

  return NextResponse.json(created, { status: 201 });
}
