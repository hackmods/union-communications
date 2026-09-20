import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import {
  bylawsListScope,
  canWriteBylawsForSession,
  requireBylawsSession,
} from "@/lib/auth/bylaws-session";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { bylawsStore } from "@/lib/hub-governance/store";
import { parseJsonBody } from "@/lib/validation/parse";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  mode: z.enum(["template", "committee"]).optional(),
  status: z
    .enum(["draft", "committee", "pending_gmm", "adopted", "archived"])
    .optional(),
  form: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const authResult = await requireBylawsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const scope = bylawsListScope(session);
  const rlsCtx = rlsContextForSession(session) ?? {};
  const drafts = await withRlsContext(rlsCtx, () =>
    bylawsStore.list(scope.unionId, scope.localId),
  );

  await auditLog.log({
    userId: session.user.id,
    action: "bylaws.list",
    resourceType: "bylaw_draft",
    resourceId: "*",
    unionId: scope.unionId,
    localId: scope.localId,
  });

  return NextResponse.json({ drafts });
}

export async function POST(request: Request) {
  const authResult = await requireBylawsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  if (!canWriteBylawsForSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.user.unionId || !session.user.localId) {
    return NextResponse.json({ error: "Local required" }, { status: 400 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = parseJsonBody(createSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const rlsCtx = rlsContextForSession(session) ?? {};
  const draft = await withRlsContext(rlsCtx, () =>
    bylawsStore.create({
      unionId: session.user.unionId!,
      localId: session.user.localId!,
      title: parsed.data.title,
      mode: parsed.data.mode,
      status: parsed.data.status,
      form: (parsed.data.form ?? {}) as Parameters<
        typeof bylawsStore.create
      >[0]["form"],
      updatedById: session.user.id,
    }),
  );

  await auditLog.log({
    userId: session.user.id,
    action: "bylaws.create",
    resourceType: "bylaw_draft",
    resourceId: draft.id,
    unionId: draft.unionId,
    localId: draft.localId,
  });

  return NextResponse.json({ draft }, { status: 201 });
}