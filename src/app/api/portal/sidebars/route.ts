import { requirePortalSession } from "@/lib/portal/portal-session";
import { getPortalAdapter } from "@/lib/portal/adapter";
import { rlsContextForActor } from "@/lib/auth/rls-scope";
import { listCircleInviteCandidates } from "@/lib/portal/circle-invitees";
import { portalJson } from "@/lib/portal/portal-json";

export async function GET(request: Request) {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session, actor } = authResult;
  const portal = await getPortalAdapter(rlsContextForActor(session, actor));
  const threadId = new URL(request.url).searchParams.get("threadId");
  if (threadId) {
    const messages = await portal.getSidebarMessages(
      session.user.unionId!,
      session.user.id,
      threadId,
    );
    if (!messages) {
      return portalJson({ error: "Not found" }, { status: 404 });
    }
    return portalJson({ messages });
  }
  const threads = await portal.listSidebarThreads(
    session.user.unionId!,
    session.user.id,
  );
  return portalJson({ threads });
}

export async function POST(request: Request) {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return portalJson(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session, actor } = authResult;
  const portal = await getPortalAdapter(rlsContextForActor(session, actor));
  const body = (await request.json()) as {
    toId?: string;
    toName?: string;
    threadId?: string;
    message?: string;
  };

  if (body.message?.trim() && body.threadId) {
    const msg = await portal.sendSidebarMessage({
      unionId: session.user.unionId!,
      threadId: body.threadId,
      authorId: session.user.id,
      authorName: session.user.name ?? "Member",
      body: body.message.trim(),
    });
    if (!msg) {
      return portalJson({ error: "Forbidden" }, { status: 403 });
    }
    return portalJson({ message: msg }, { status: 201 });
  }

  if (!body.toId || !body.toName) {
    return portalJson({ error: "Missing recipient" }, { status: 400 });
  }
  if (body.toId === session.user.id) {
    return portalJson({ error: "Cannot message yourself" }, { status: 400 });
  }

  const unionId = session.user.unionId!;
  const peer = (await listCircleInviteCandidates(unionId, rlsContextForActor(session, actor))).find(
    (user) => user.id === body.toId,
  );
  if (!peer) {
    return portalJson(
      { error: "That person is not in this union." },
      { status: 400 },
    );
  }

  const thread = await portal.ensureSidebarThread({
    unionId,
    fromId: session.user.id,
    fromName: session.user.name ?? "Member",
    toId: peer.id,
    toName: peer.name,
  });

  if (body.message?.trim()) {
    await portal.sendSidebarMessage({
      unionId,
      threadId: thread.id,
      authorId: session.user.id,
      authorName: session.user.name ?? "Member",
      body: body.message.trim(),
    });
  }

  return portalJson({ thread }, { status: 201 });
}
