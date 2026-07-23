import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertGrievanceEdit,
  assertGrievanceView,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { attachmentStore } from "@/lib/attachments/memory-adapter";
import { grievanceStore } from "@/lib/grievance/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { id } = await params;
  const data = await grievanceStore.getById(id);
  if (!data || !assertGrievanceView(authResult.session, data.grievance)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const attachments = await attachmentStore.listForGrievance(id);
  return NextResponse.json({ attachments });
}

export async function POST(request: Request, { params }: Params) {
  const authResult = await requireGrievanceSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { id } = await params;
  const data = await grievanceStore.getById(id);
  if (!data || !assertGrievanceEdit(authResult.session, data.grievance)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    contentBase64?: string;
  };
  if (!body.fileName || !body.mimeType || typeof body.sizeBytes !== "number") {
    return NextResponse.json(
      { error: "fileName, mimeType, and sizeBytes are required" },
      { status: 400 },
    );
  }

  const result = await attachmentStore.createForGrievance(
    id,
    {
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      contentBase64: body.contentBase64,
    },
    {
      unionId: data.grievance.unionId,
      localId: data.grievance.localId,
      bargainingUnitId: data.grievance.bargainingUnitId,
      uploadedById: authResult.session.user.id,
    },
  );

  if (result.error || !result.attachment) {
    return NextResponse.json(
      { error: result.error ?? "Upload failed" },
      { status: 400 },
    );
  }

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "grievance.attachment_upload",
    resourceType: "attachment",
    resourceId: result.attachment.id,
    unionId: data.grievance.unionId,
    localId: data.grievance.localId,
  });

  return NextResponse.json({ attachment: result.attachment }, { status: 201 });
}
