import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { canPublishMarketplace } from "@/lib/qol/access";
import { marketplaceStore } from "@/lib/marketplace/memory-adapter";
import type { UserRole } from "@/types/tenant";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const template = await marketplaceStore.getById(id);
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (template.unionId !== authResult.session.user.unionId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "marketplace.download",
    resourceType: "shared_template",
    resourceId: id,
    unionId: template.unionId,
    localId: template.localId,
  });

  return NextResponse.json({ template });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const roles = (authResult.session.user.roles ?? []) as UserRole[];
  if (!canPublishMarketplace(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await marketplaceStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.unionId !== authResult.session.user.unionId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isOwner = existing.sharedById === authResult.session.user.id;
  const isPresident = roles.some((r) =>
    ["local_president", "union_admin", "platform_admin"].includes(r),
  );
  if (!isOwner && !isPresident) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await marketplaceStore.remove(id);
  await auditLog.log({
    userId: authResult.session.user.id,
    action: "marketplace.delete",
    resourceType: "shared_template",
    resourceId: id,
    unionId: existing.unionId,
    localId: existing.localId,
  });

  return NextResponse.json({ ok: true });
}
