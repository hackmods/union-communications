import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireGrievanceSession } from "@/lib/auth/grievance-session";
import { canCrossLocalGrievance } from "@/lib/grievance/access";
import { canManageQolContent } from "@/lib/qol/access";
import { documentStore } from "@/lib/documents/store";
import type { UserRole } from "@/types/tenant";

export async function GET() {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const unionId = session.user.unionId;
  if (!unionId) {
    return NextResponse.json({ error: "Union required" }, { status: 400 });
  }

  const roles = (session.user.roles ?? []) as UserRole[];
  const documents = await documentStore.list({
    unionId,
    localId: canCrossLocalGrievance(roles) ? undefined : session.user.localId,
    bargainingUnitId: session.user.bargainingUnitId,
  });

  await auditLog.log({
    userId: session.user.id,
    action: "document.list",
    resourceType: "document",
    resourceId: "*",
    unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ documents });
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
  if (!canManageQolContent(roles)) {
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

  const body = (await request.json()) as {
    title?: string;
    category?: string;
    description?: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    contentBase64?: string;
  };

  if (
    !body.title ||
    !body.fileName ||
    !body.mimeType ||
    typeof body.sizeBytes !== "number"
  ) {
    return NextResponse.json(
      { error: "title, fileName, mimeType, and sizeBytes are required" },
      { status: 400 },
    );
  }
  if (!body.contentBase64) {
    return NextResponse.json(
      { error: "contentBase64 is required" },
      { status: 400 },
    );
  }

  const result = await documentStore.create(
    {
      title: body.title,
      category: body.category,
      description: body.description,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      contentBase64: body.contentBase64,
      localId,
      bargainingUnitId: session.user.bargainingUnitId,
    },
    {
      unionId,
      localId,
      bargainingUnitId: session.user.bargainingUnitId,
      uploadedById: session.user.id,
    },
  );

  if (result.error || !result.document) {
    return NextResponse.json(
      { error: result.error ?? "Upload failed" },
      { status: 400 },
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "document.create",
    resourceType: "document",
    resourceId: result.document.id,
    unionId,
    localId,
  });

  return NextResponse.json({ document: result.document }, { status: 201 });
}
