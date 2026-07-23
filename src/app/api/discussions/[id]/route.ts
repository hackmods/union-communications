import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertDiscussionThreadView,
  requireDiscussionsSession,
} from "@/lib/auth/discussions-session";
import { discussionsStore } from "@/lib/discussions/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireDiscussionsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { id } = await context.params;
  const data = await discussionsStore.getThreadWithPosts(id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await assertDiscussionThreadView(session, data.thread))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "discussions.threads.get",
    resourceType: "discussion_thread",
    resourceId: id,
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json(data);
}
