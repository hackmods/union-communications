import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { attachmentStore } from "@/lib/attachments/store";
import {
  assertExpenseView,
  requireExpenseSession,
} from "@/lib/auth/expenses-session";
import { canEditDraftExpense } from "@/lib/expenses/access";
import { expenseStore } from "@/lib/expenses/store";
import type { UserRole } from "@/types/tenant";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireExpenseSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await params;
  const submission = await expenseStore.getById(id);
  if (
    !submission ||
    !assertExpenseView(authResult.session, submission)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const attachments = await attachmentStore.listForExpenseSubmission(id);
  return NextResponse.json({ attachments });
}

export async function POST(request: Request, { params }: Params) {
  const authResult = await requireExpenseSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const roles = (session.user.roles ?? []) as UserRole[];
  const { id } = await params;
  const submission = await expenseStore.getById(id);
  if (!submission || !assertExpenseView(session, submission)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canEditDraftExpense(submission, session.user.id, roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const result = await attachmentStore.createForExpenseSubmission(
    id,
    {
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      contentBase64: body.contentBase64,
    },
    {
      unionId: submission.unionId,
      localId: submission.localId,
      uploadedById: session.user.id,
    },
  );

  if (result.error || !result.attachment) {
    return NextResponse.json(
      { error: result.error ?? "Upload failed" },
      { status: 400 },
    );
  }

  await auditLog.log({
    userId: session.user.id,
    action: "expenses.attachment_upload",
    resourceType: "attachment",
    resourceId: result.attachment.id,
    unionId: submission.unionId,
    localId: submission.localId,
  });

  return NextResponse.json({ attachment: result.attachment }, { status: 201 });
}
