import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";
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
  const { session } = authResult;
  const threadId = new URL(request.url).searchParams.get("threadId");
  if (threadId) {
    const messages = portalStore.getSidebarMessages(
      session.user.unionId!,
      session.user.id,
      threadId,
    );
    if (!messages) {
      return portalJson({ error: "Not found" }, { status: 404 });
    }
    return portalJson({ messages });
  }
  const threads = portalStore.listSidebarThreads(
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
  const { session } = authResult;
  const body = (await request.json()) as {
    toId?: string;
    toName?: string;
    threadId?: string;
    message?: string;
  };

  if (body.message?.trim() && body.threadId) {
    const msg = portalStore.sendSidebarMessage({
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
  const peer = (await listCircleInviteCandidates(unionId)).find(
    (user) => user.id === body.toId,
  );
  if (!peer) {
    return portalJson(
      { error: "That person is not in this union." },
      { status: 400 },
    );
  }

  const thread = portalStore.ensureSidebarThread({
    unionId,
    fromId: session.user.id,
    fromName: session.user.name ?? "Member",
    toId: peer.id,
    toName: peer.name,
  });

  if (body.message?.trim()) {
    portalStore.sendSidebarMessage({
      unionId,
      threadId: thread.id,
      authorId: session.user.id,
      authorName: session.user.name ?? "Member",
      body: body.message.trim(),
    });
  }

  return portalJson({ thread }, { status: 201 });
}
