import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { snippetStore } from "@/lib/snippets/store";
import type { UserRole } from "@/types/tenant";

const resetSchema = z
  .object({
    confirm: z.literal("RESET SNIPPETS"),
  })
  .strict();

function canResetSnippetLibrary(roles: UserRole[]): boolean {
  return roles.some((r) => ["union_admin", "platform_admin"].includes(r));
}

export async function POST(request: Request) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session, actor } = authResult;
  const roles = actor.roles as UserRole[];
  if (!canResetSnippetLibrary(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const unionId = session.user.unionId;
  if (!unionId) {
    return NextResponse.json({ error: "Union required" }, { status: 400 });
  }

  try {
    const raw = await request.json();
    resetSchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const removed = await snippetStore.resetUnion(unionId);
  const restored = await snippetStore.reseedReferencePacks(unionId);

  await auditLog.log({
    userId: session.user.id,
    action: "snippet.reset",
    resourceType: "ca_snippet",
    resourceId: "*",
    unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ ok: true, removed, restored });
}
