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
import { createDiscussionPostSchema } from "@/lib/validation/discussions";

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
  const thread = await discussionsStore.getThread(id);
  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await assertDiscussionThreadView(session, thread))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const posts = await discussionsStore.listPosts(id);

  await auditLog.log({
    userId: session.user.id,
    action: "discussions.posts.list",
    resourceType: "discussion_thread",
    resourceId: id,
    unionId: session.user.unionId,
    localId: session.user.localId,
  });

  return NextResponse.json({ posts });
}

export async function POST(
  request: Request,
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
  const thread = await discussionsStore.getThread(id);
  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await assertDiscussionThreadPost(session, thread))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(createDiscussionPostSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const { unionId, localId } = tenantIdsForDiscussionsSession(session);
  const post = await discussionsStore.createPost(id, parsed.data, {
    unionId: thread.unionId,
    localId: thread.localId,
    authorId: session.user.id,
    authorName: session.user.name ?? session.user.email ?? "Officer",
  });

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "discussions.posts.create",
    resourceType: "discussion_post",
    resourceId: post.id,
    unionId,
    localId,
  });

  return NextResponse.json({ post }, { status: 201 });
}
