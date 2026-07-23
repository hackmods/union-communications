import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import {
  listFiltersForBumpingSession,
  requireBumpingSession,
} from "@/lib/auth/bumping-session";
import { canWriteBumping } from "@/lib/bumping/access";
import { bumpingStore } from "@/lib/bumping/memory-adapter";
import { parseJsonBody } from "@/lib/validation/parse";
import { createBumpingCaseSchema } from "@/lib/validation/bumping";
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
  const parsed = parseJsonBody(createBumpingCaseSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const unionId = session.user.unionId;
  const localId = session.user.localId;
  if (!unionId || !localId) {
    return NextResponse.json(
      { error: "Union and local context required" },
      { status: 400 },
    );
  }

  const emptyPosition = {
    title: "",
    duties: "",
    qualifications: "",
    seniorityNotes: "",
  };

  const normalizePosition = (
    value: typeof parsed.data.incumbentPosition,
  ) => ({
    title: value?.title ?? "",
    duties: value?.duties ?? "",
    qualifications: value?.qualifications ?? "",
    seniorityNotes: value?.seniorityNotes ?? "",
    ...(value?.sourceText !== undefined
      ? { sourceText: value.sourceText }
      : {}),
    ...(value?.fileName !== undefined ? { fileName: value.fileName } : {}),
  });

  const created = await bumpingStore.create(
    {
      memberRef: parsed.data.memberRef,
      seniorityDate: parsed.data.seniorityDate,
      currentPosition: parsed.data.currentPosition,
      targetPosition: parsed.data.targetPosition,
      scenario: parsed.data.scenario,
      incumbentPosition: parsed.data.incumbentPosition
        ? normalizePosition(parsed.data.incumbentPosition)
        : emptyPosition,
      bumpingPosition: parsed.data.bumpingPosition
        ? normalizePosition(parsed.data.bumpingPosition)
        : emptyPosition,
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
