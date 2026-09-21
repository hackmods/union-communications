import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertGrievanceEdit,
  assertGrievanceView,
  requireGrievanceSession,
} from "@/lib/auth/grievance-session";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import { attachmentStore } from "@/lib/attachments/store";
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
  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const { id } = await params;
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data || !await assertGrievanceView(actor, data.grievance)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const attachments = await withRlsContext(rls, () =>
    attachmentStore.listForGrievance(id),
  );
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
  const { session, actor } = authResult;
  const rls = rlsContextForActor(session, actor) ?? {};
  const { id } = await params;
  const data = await withRlsContext(rls, () => grievanceStore.getById(id));
  if (!data || !await assertGrievanceEdit(actor, data.grievance)) {
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

  const { fileName, mimeType, sizeBytes, contentBase64 } = body;

  const result = await withRlsContext(rls, () =>
    attachmentStore.createForGrievance(
      id,
      {
        fileName,
        mimeType,
        sizeBytes,
        contentBase64,
      },
      {
        unionId: data.grievance.unionId,
        localId: data.grievance.localId,
        bargainingUnitId: data.grievance.bargainingUnitId,
        uploadedById: session.user.id,
      },
    ),
  );

  if (result.error || !result.attachment) {
    return NextResponse.json(
      { error: result.error ?? "Upload failed" },
      { status: 400 },
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "grievance.attachment_upload",
    resourceType: "attachment",
    resourceId: result.attachment.id,
    unionId: data.grievance.unionId,
    localId: data.grievance.localId,
  });

  return NextResponse.json({ attachment: result.attachment }, { status: 201 });
}
