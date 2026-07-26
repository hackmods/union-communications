import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertDiscussionThreadPost,
  assertDiscussionThreadView,
  requireDiscussionsSession,
  tenantIdsForDiscussionsSession,
} from "@/lib/auth/discussions-session";
import { discussionsStore } from "@/lib/discussions/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { toggleHubReactionSchema } from "@/lib/validation/discussions";

type RouteContext = {
  params: Promise<{ id: string; postId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireDiscussionsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { id, postId } = await context.params;
  const thread = await discussionsStore.getThread(id);
  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await assertDiscussionThreadPost(session, thread))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const post = await discussionsStore.getPost(postId);
  if (!post || post.threadId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await assertDiscussionThreadView(session, thread))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(toggleHubReactionSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const updated = await discussionsStore.togglePostReaction(
    postId,
    parsed.data.kind,
    session.user.id,
  );
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { unionId, localId } = tenantIdsForDiscussionsSession(session);
  await auditLog.log({
    userId: session.user.id,
    action: "discussions.posts.reaction",
    resourceType: "discussion_post",
    resourceId: postId,
    unionId,
    localId,
  });

  return NextResponse.json({ post: updated });
}
