import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import { requireSiteFeedbackInboxSession } from "@/lib/auth/platform-feedback-session";
import { toInboxItem } from "@/lib/platform-feedback/source";
import { platformFeedbackStore } from "@/lib/platform-feedback/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { updateSiteFeedbackSchema } from "@/lib/validation/platform-feedback";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSiteFeedbackInboxSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const item = await platformFeedbackStore.getById(id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "feedback.view",
    resourceType: "platform_feedback",
    resourceId: item.id,
  });

  return NextResponse.json({ item: toInboxItem(item) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSiteFeedbackInboxSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(updateSiteFeedbackSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const item = await platformFeedbackStore.update(id, parsed.data);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "feedback.update",
    resourceType: "platform_feedback",
    resourceId: item.id,
  });

  return NextResponse.json({ item: toInboxItem(item) });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSiteFeedbackInboxSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await context.params;
  const existing = await platformFeedbackStore.getById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await platformFeedbackStore.delete(id);

  await auditLog.log({
    userId: authResult.session.user.id,
    action: "feedback.delete",
    resourceType: "platform_feedback",
    resourceId: id,
  });

  return NextResponse.json({ ok: true });
}
