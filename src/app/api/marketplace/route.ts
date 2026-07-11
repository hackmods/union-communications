import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/memory-adapter";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { canPublishMarketplace } from "@/lib/qol/access";
import { marketplaceStore } from "@/lib/marketplace/memory-adapter";
import type { UserRole } from "@/types/tenant";

export async function GET(request: Request) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const unionId = authResult.session.user.unionId;
  if (!unionId) {
    return NextResponse.json({ error: "Union required" }, { status: 400 });
  }

  const url = new URL(request.url);
  const templates = await marketplaceStore.list({
    unionId,
    kind: url.searchParams.get("kind") ?? undefined,
    query: url.searchParams.get("q") ?? undefined,
  });

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "marketplace.list",
    resourceType: "shared_template",
    resourceId: "*",
    unionId,
    localId: authResult.session.user.localId,
  });

  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canPublishMarketplace(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const unionId = session.user.unionId;
  const localId = session.user.localId;
  if (!unionId || !localId) {
    return NextResponse.json(
      { error: "Union and local required" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const { kind, title, description, body: templateBody } = body;
  if (!kind || !title || !templateBody) {
    return NextResponse.json(
      { error: "kind, title, and body are required" },
      { status: 400 },
    );
  }

  const template = await marketplaceStore.create(
    {
      kind,
      title,
      description: description ?? "",
      body: templateBody,
    },
    {
      unionId,
      localId,
      sharedById: session.user.id,
      sharedByName: session.user.name ?? session.user.email ?? "Officer",
    },
  );

  await auditLog.log({
    userId: session.user.id,
    action: "marketplace.share",
    resourceType: "shared_template",
    resourceId: template.id,
    unionId,
    localId,
  });

  return NextResponse.json({ template }, { status: 201 });
}
