import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/portal/portal-session";
import { portalStore } from "@/lib/portal/memory-adapter";
import { canAdminCircle, canWriteCircle } from "@/lib/portal/access";
import type { UserRole } from "@/types/tenant";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const detail = portalStore.getCircleDetail(
    session.user.unionId!,
    session.user.id,
    id,
  );
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const oversight = portalStore.oversight(id, session.user.unionId!);
  return NextResponse.json({ detail, oversight });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const detail = portalStore.getCircleDetail(
    session.user.unionId!,
    session.user.id,
    id,
  );
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  const body = (await request.json()) as {
    starred?: boolean;
    muted?: boolean;
    mutedTools?: import("@/types/portal").PortalToolMute[];
    archive?: boolean;
  };

  if (body.archive) {
    if (!canAdminCircle(roles, detail.membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    portalStore.archiveCircle(id, session.user.unionId!);
    return NextResponse.json({ ok: true });
  }

  if (
    body.starred !== undefined ||
    body.muted !== undefined ||
    body.mutedTools !== undefined
  ) {
    const membership = portalStore.updateMembership(session.user.id, id, {
      ...(body.starred !== undefined ? { starred: body.starred } : {}),
      ...(body.muted !== undefined ? { muted: body.muted } : {}),
      ...(body.mutedTools !== undefined
        ? { mutedTools: body.mutedTools }
        : {}),
    });
    return NextResponse.json({ membership });
  }

  return NextResponse.json({ error: "No changes" }, { status: 400 });
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const authResult = await requirePortalSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }
  const { session } = authResult;
  const detail = portalStore.getCircleDetail(
    session.user.unionId!,
    session.user.id,
    id,
  );
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    tool:
      | "bulletin"
      | "comment"
      | "action"
      | "complete_action"
      | "calendar"
      | "binder"
      | "floor"
      | "roll_call"
      | "roll_call_question"
      | "pipeline_card"
      | "pipeline_move"
      | "pin_bulletin"
      | "momentum"
      | "roster_invite"
      | "set_fronts"
      | "soft_delete"
      | "import_csv"
      | "activity_pack";
    title?: string;
    body?: string;
    listName?: string;
    assigneeId?: string;
    assigneeName?: string;
    dueAt?: string;
    postId?: string;
    actionId?: string;
    sourceBulletinPostId?: string;
    startsAt?: string;
    endsAt?: string;
    location?: string;
    externalUrl?: string;
    folder?: string;
    content?: string;
    contentType?: "note" | "link" | "file_meta";
    questionId?: string;
    columnId?: string;
    cardId?: string;
    boardId?: string;
    pinned?: boolean;
    progress?: number;
    momentumId?: string;
    notes?: string;
    userId?: string;
    userName?: string;
    frontStartsAt?: string;
    frontEndsAt?: string;
    cadence?: "weekly" | "biweekly" | "monthly";
    resourceType?: "bulletin" | "action" | "binder";
    resourceId?: string;
    csv?: string;
  };

  const unionId = session.user.unionId!;
  const authorId = session.user.id;
  const authorName = session.user.name ?? "Member";
  const roles = (session.user.roles ?? []) as UserRole[];

  if (body.tool === "activity_pack") {
    const pack = portalStore.exportActivityPack(id, unionId);
    if (!pack) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ pack });
  }

  if (body.tool === "import_csv") {
    if (!canAdminCircle(roles, detail.membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!body.csv?.trim()) {
      return NextResponse.json({ error: "Missing csv" }, { status: 400 });
    }
    const result = portalStore.importBasecampCsv(
      id,
      unionId,
      authorId,
      authorName,
      body.csv,
    );
    return NextResponse.json(result, { status: 201 });
  }

  if (!canWriteCircle(detail.membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  switch (body.tool) {
    case "bulletin": {
      if (!body.title?.trim() || !body.body?.trim()) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const post = portalStore.addBulletin({
        circleId: id,
        unionId,
        authorId,
        authorName,
        title: body.title.trim(),
        body: body.body.trim(),
      });
      return NextResponse.json({ post }, { status: 201 });
    }
    case "comment": {
      if (!body.postId || !body.body?.trim()) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const comment = portalStore.addComment({
        postId: body.postId,
        authorId,
        authorName,
        body: body.body.trim(),
      });
      return NextResponse.json({ comment }, { status: 201 });
    }
    case "action": {
      if (!body.title?.trim()) {
        return NextResponse.json({ error: "Missing title" }, { status: 400 });
      }
      const action = portalStore.addAction({
        circleId: id,
        unionId,
        listName: body.listName?.trim() || "Actions",
        title: body.title.trim(),
        notes: body.body?.trim(),
        assigneeId: body.assigneeId,
        assigneeName: body.assigneeName,
        dueAt: body.dueAt,
        createdById: authorId,
        sourceBulletinPostId: body.sourceBulletinPostId,
      });
      return NextResponse.json({ action }, { status: 201 });
    }
    case "complete_action": {
      if (!body.actionId) {
        return NextResponse.json({ error: "Missing actionId" }, { status: 400 });
      }
      const action = portalStore.completeAction(body.actionId, unionId);
      if (!action) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ action });
    }
    case "calendar": {
      if (!body.title?.trim() || !body.startsAt) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const event = portalStore.addCalendarEvent({
        circleId: id,
        unionId,
        title: body.title.trim(),
        description: body.body?.trim(),
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        location: body.location,
        externalUrl: body.externalUrl?.trim() || undefined,
        createdById: authorId,
      });
      return NextResponse.json({ event }, { status: 201 });
    }
    case "binder": {
      if (!body.title?.trim() || !body.content?.trim()) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const item = portalStore.addBinderItem({
        circleId: id,
        unionId,
        title: body.title.trim(),
        folder: body.folder,
        content: body.content.trim(),
        contentType: body.contentType ?? "note",
        createdById: authorId,
        createdByName: authorName,
      });
      return NextResponse.json({ item }, { status: 201 });
    }
    case "floor": {
      if (!body.body?.trim()) {
        return NextResponse.json({ error: "Missing body" }, { status: 400 });
      }
      const message = portalStore.addFloorMessage({
        circleId: id,
        unionId,
        authorId,
        authorName,
        body: body.body.trim(),
      });
      return NextResponse.json({ message }, { status: 201 });
    }
    case "roll_call": {
      if (!body.questionId || !body.body?.trim()) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const answer = portalStore.addRollCallAnswer({
        questionId: body.questionId,
        circleId: id,
        authorId,
        authorName,
        body: body.body.trim(),
      });
      return NextResponse.json({ answer }, { status: 201 });
    }
    case "pipeline_card": {
      if (!body.boardId || !body.columnId || !body.title?.trim()) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const card = portalStore.addPipelineCard({
        boardId: body.boardId,
        columnId: body.columnId,
        title: body.title.trim(),
        body: body.body,
      });
      return NextResponse.json({ card }, { status: 201 });
    }
    case "pipeline_move": {
      if (!body.cardId || !body.columnId) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const card = portalStore.movePipelineCard(
        body.cardId,
        body.columnId,
        unionId,
      );
      if (!card) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ card });
    }
    case "pin_bulletin": {
      if (!body.postId || body.pinned === undefined) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      if (!canAdminCircle(roles, detail.membership.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const post = portalStore.pinBulletin(body.postId, unionId, body.pinned);
      if (!post) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ post });
    }
    case "momentum": {
      if (!body.title?.trim() || body.progress === undefined) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const item = portalStore.upsertMomentum({
        id: body.momentumId,
        circleId: id,
        unionId,
        title: body.title.trim(),
        notes: body.notes?.trim(),
        progress: body.progress,
        updatedById: authorId,
        updatedByName: authorName,
      });
      return NextResponse.json({ item }, { status: 201 });
    }
    case "roster_invite": {
      if (!canAdminCircle(roles, detail.membership.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.userId || !body.userName) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const membership = portalStore.inviteToRoster({
        circleId: id,
        userId: body.userId,
        userName: body.userName,
      });
      return NextResponse.json({ membership }, { status: 201 });
    }
    case "roll_call_question": {
      if (!canAdminCircle(roles, detail.membership.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!body.title?.trim()) {
        return NextResponse.json({ error: "Missing question" }, { status: 400 });
      }
      const question = portalStore.addRollCallQuestion({
        circleId: id,
        unionId,
        question: body.title.trim(),
        cadence: body.cadence,
      });
      return NextResponse.json({ question }, { status: 201 });
    }
    case "set_fronts": {
      if (!canAdminCircle(roles, detail.membership.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const circle = portalStore.setFrontDates(
        id,
        unionId,
        body.frontStartsAt,
        body.frontEndsAt,
      );
      if (!circle) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ circle });
    }
    case "soft_delete": {
      if (!body.resourceType || !body.resourceId) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const ok = portalStore.softDelete(
        body.resourceType,
        body.resourceId,
        unionId,
        authorId,
      );
      if (!ok) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown tool" }, { status: 400 });
  }
}
