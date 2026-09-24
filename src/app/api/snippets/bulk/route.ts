import { NextResponse } from "next/server";
import { z } from "zod";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { withRlsContext } from "@/lib/db/rls-context";
import { canManageQolContent } from "@/lib/qol/access";
import { parseSnippetBulk } from "@/lib/snippets/bulk-parse";
import { snippetStore } from "@/lib/snippets/store";
import type { UserRole } from "@/types/tenant";

const bulkSchema = z
  .object({
    format: z.enum(["csv", "text"]),
    content: z.string().min(1).max(500_000),
    mode: z.enum(["append", "replace_union"]).optional().default("append"),
  })
  .strict();

/** Presidents, VPs (local_exec), and union/platform admins may replace the union library. */
function canReplaceUnionLibrary(roles: UserRole[]): boolean {
  return roles.some((r) =>
    [
      "union_admin",
      "platform_admin",
      "local_president",
      "local_exec",
    ].includes(r),
  );
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
  const unionId = session.user.unionId;
  if (!unionId) {
    return NextResponse.json({ error: "Union required" }, { status: 400 });
  }

  let parsed: z.infer<typeof bulkSchema>;
  try {
    const raw = await request.json();
    parsed = bulkSchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (parsed.mode === "replace_union") {
    if (!canReplaceUnionLibrary(roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!canManageQolContent(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const inputs = parseSnippetBulk(parsed.format, parsed.content);
  if (inputs.length === 0) {
    return NextResponse.json(
      { error: "No valid snippets found in content" },
      { status: 400 },
    );
  }

  const scopedInputs = inputs.map((input) => ({
    ...input,
    localId: input.localId ?? actor.activeLocalId,
    bargainingUnitId: input.bargainingUnitId ?? actor.bargainingUnitId,
  }));

  const rlsCtx = {
    unionId,
    localId: session.user.localId,
    crossLocal: true,
  };

  try {
    let removed = 0;
    if (parsed.mode === "replace_union") {
      removed = await withRlsContext(rlsCtx, () =>
        snippetStore.resetUnion(unionId),
      );
    }

    const meta = {
      unionId,
      createdById: session.user.id,
      createdByName: session.user.name ?? session.user.email ?? "Officer",
    };
    const result = await withRlsContext(rlsCtx, () =>
      snippetStore.bulkCreate(scopedInputs, meta),
    );

    await auditLog.log({
      userId: session.user.id,
      action:
        parsed.mode === "replace_union" ? "snippet.bulk_replace" : "snippet.bulk",
      resourceType: "ca_snippet",
      resourceId: "*",
      unionId,
      localId: session.user.localId,
    });

    return NextResponse.json(
      {
        ...result,
        removed,
        mode: parsed.mode,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[snippets] bulk import failed", err);
    return NextResponse.json(
      { error: "Import failed. Check the format and try again." },
      { status: 500 },
    );
  }
}
