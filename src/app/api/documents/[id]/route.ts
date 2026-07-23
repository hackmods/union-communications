import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import { canDeleteSharedContent } from "@/lib/qol/access";
import { documentStore } from "@/lib/documents/store";
import type { UserRole } from "@/types/tenant";

type Params = { params: Promise<{ id: string }> };

function canViewDocument(
  roles: UserRole[],
  sessionLocalId: string | undefined,
  docLocalId: string,
): boolean {
  if (canCrossLocalGrievance(roles)) return true;
  return Boolean(sessionLocalId && sessionLocalId === docLocalId);
}

export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await params;
  const doc = await documentStore.getById(id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (doc.unionId !== session.user.unionId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canViewDocument(roles, session.user.localId, doc.localId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canDeleteSharedContent(roles, doc.uploadedById, session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await documentStore.remove(id);

  await auditLog.log({
    userId: session.user.id,
    action: "document.delete",
    resourceType: "document",
    resourceId: id,
    unionId: doc.unionId,
    localId: doc.localId,
  });

  return NextResponse.json({ ok: true });
}
