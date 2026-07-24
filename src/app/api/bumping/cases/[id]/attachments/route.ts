import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertBumpingEdit,
  assertBumpingView,
  requireBumpingSession,
} from "@/lib/auth/bumping-session";
import { attachmentStore } from "@/lib/attachments/store";
import { bumpingStore } from "@/lib/bumping/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireBumpingSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { id } = await params;
  const data = await bumpingStore.getById(id);
  if (!data || !assertBumpingView(authResult.session, data.bumpingCase)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const attachments = await attachmentStore.listForBumping(id);
  return NextResponse.json({ attachments });
}

export async function POST(request: Request, { params }: Params) {
  const authResult = await requireBumpingSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { id } = await params;
  const data = await bumpingStore.getById(id);
  if (!data || !assertBumpingEdit(authResult.session, data.bumpingCase)) {
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
  if (!body.contentBase64) {
    return NextResponse.json(
      { error: "contentBase64 is required" },
      { status: 400 },
    );
  }

  const result = await attachmentStore.createForBumping(
    id,
    {
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      contentBase64: body.contentBase64,
    },
    {
      unionId: data.bumpingCase.unionId,
      localId: data.bumpingCase.localId,
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
    action: "bumping.attachment_upload",
    resourceType: "attachment",
    resourceId: result.attachment.id,
    unionId: data.bumpingCase.unionId,
    localId: data.bumpingCase.localId,
  });

  return NextResponse.json({ attachment: result.attachment }, { status: 201 });
}
