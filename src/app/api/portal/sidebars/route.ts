import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";

export async function GET(request: Request) {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ messages });
  }
  const threads = portalStore.listSidebarThreads(
    session.user.unionId!,
    session.user.id,
  );
  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ message: msg }, { status: 201 });
  }

  if (!body.toId || !body.toName) {
    return NextResponse.json({ error: "Missing recipient" }, { status: 400 });
  }
  if (body.toId === session.user.id) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  const thread = portalStore.ensureSidebarThread({
    unionId: session.user.unionId!,
    fromId: session.user.id,
    fromName: session.user.name ?? "Member",
    toId: body.toId,
    toName: body.toName,
  });

  if (body.message?.trim()) {
    portalStore.sendSidebarMessage({
      unionId: session.user.unionId!,
      threadId: thread.id,
      authorId: session.user.id,
      authorName: session.user.name ?? "Member",
      body: body.message.trim(),
    });
  }

  return NextResponse.json({ thread }, { status: 201 });
}
