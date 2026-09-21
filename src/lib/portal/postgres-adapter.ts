import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { withRlsContext, type RlsSessionContext } from "@/lib/db/rls-context";
import {
  auditLog,
  portalActions,
  portalBinderItems,
  portalBulletinComments,
  portalBulletinPosts,
  portalCalendarEvents,
  portalCircleMemberships,
  portalCircles,
  portalDispatchItems,
  portalFloorMessages,
  portalMomentumItems,
  portalPipelineBoards,
  portalPipelineCards,
  portalPipelineColumns,
  portalRollCallAnswers,
  portalRollCallQuestions,
  portalSidebarMessages,
  portalSidebarParticipants,
  portalSidebarThreads,
  users,
} from "@/lib/db/schema";
import { parseBasecampCsv, type BasecampImportRow } from "@/lib/portal/basecamp-import";
import { resolveMentions } from "@/lib/portal/mentions";
import type { PortalAdapter } from "@/lib/portal/adapter";
import type {
  ActionItem,
  BinderItem,
  BulletinComment,
  BulletinPost,
  CalendarEvent,
  Circle,
  CircleDetailPayload,
  CircleMembership,
  DispatchItem,
  FloorMessage,
  MomentumItem,
  PipelineBoard,
  PipelineCard,
  PipelineColumn,
  PortalAuditEntry,
  PortalSearchHit,
  PortalToolMute,
  RollCallAnswer,
  RollCallQuestion,
  SidebarMessage,
  SidebarThread,
  StationPayload,
} from "@/types/portal";

const makeId = (prefix: string) => `${prefix}-${randomUUID()}`;
const instant = () => new Date();
const iso = (value: Date | null | undefined) => value?.toISOString();
const asDate = (value: string | undefined) => value ? new Date(value) : null;

function mapCircle(row: typeof portalCircles.$inferSelect): Circle {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId ?? undefined,
    kind: row.kind as Circle["kind"],
    name: row.name,
    description: row.description ?? undefined,
    visibility: row.visibility as Circle["visibility"],
    frontStartsAt: iso(row.frontStartsAt),
    frontEndsAt: iso(row.frontEndsAt),
    archivedAt: iso(row.archivedAt),
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapMembership(row: typeof portalCircleMemberships.$inferSelect): CircleMembership {
  return {
    id: row.id,
    circleId: row.circleId,
    userId: row.userId,
    userName: row.userName,
    role: row.role as CircleMembership["role"],
    muted: row.muted,
    mutedTools: (row.mutedTools ?? []) as PortalToolMute[],
    starred: row.starred,
    joinedAt: row.joinedAt.toISOString(),
  };
}

function mapBulletin(row: typeof portalBulletinPosts.$inferSelect): BulletinPost {
  return {
    id: row.id, circleId: row.circleId, unionId: row.unionId,
    authorId: row.authorId, authorName: row.authorName, title: row.title,
    body: row.body, pinned: row.pinned, deletedAt: iso(row.deletedAt),
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

function mapAction(row: typeof portalActions.$inferSelect): ActionItem {
  return {
    id: row.id, circleId: row.circleId, unionId: row.unionId,
    listName: row.listName, title: row.title, notes: row.notes ?? undefined,
    assigneeId: row.assigneeId ?? undefined, assigneeName: row.assigneeName ?? undefined,
    dueAt: iso(row.dueAt), completedAt: iso(row.completedAt), deletedAt: iso(row.deletedAt),
    sourceBulletinPostId: row.sourceBulletinPostId ?? undefined,
    createdById: row.createdById, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

function mapCalendar(row: typeof portalCalendarEvents.$inferSelect): CalendarEvent {
  return {
    id: row.id, circleId: row.circleId, unionId: row.unionId, title: row.title,
    description: row.description ?? undefined, startsAt: row.startsAt.toISOString(),
    endsAt: iso(row.endsAt), location: row.location ?? undefined,
    externalUrl: row.externalUrl ?? undefined, createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapBinder(row: typeof portalBinderItems.$inferSelect): BinderItem {
  return {
    id: row.id, circleId: row.circleId, unionId: row.unionId, title: row.title,
    folder: row.folder ?? undefined, content: row.content,
    contentType: row.contentType as BinderItem["contentType"],
    createdById: row.createdById, createdByName: row.createdByName,
    deletedAt: iso(row.deletedAt), createdAt: row.createdAt.toISOString(),
  };
}

function mapFloor(row: typeof portalFloorMessages.$inferSelect): FloorMessage {
  return {
    id: row.id, circleId: row.circleId, unionId: row.unionId,
    authorId: row.authorId, authorName: row.authorName, body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapQuestion(row: typeof portalRollCallQuestions.$inferSelect): RollCallQuestion {
  return {
    id: row.id, circleId: row.circleId, unionId: row.unionId,
    question: row.question, cadence: row.cadence as RollCallQuestion["cadence"],
    active: row.active, createdAt: row.createdAt.toISOString(),
  };
}

function mapAnswer(row: typeof portalRollCallAnswers.$inferSelect): RollCallAnswer {
  return {
    id: row.id, questionId: row.questionId, circleId: row.circleId,
    authorId: row.authorId, authorName: row.authorName, body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapMomentum(row: typeof portalMomentumItems.$inferSelect): MomentumItem {
  return {
    id: row.id, circleId: row.circleId, unionId: row.unionId, title: row.title,
    notes: row.notes ?? undefined, progress: row.progress,
    updatedById: row.updatedById, updatedByName: row.updatedByName,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSidebarThread(
  row: typeof portalSidebarThreads.$inferSelect,
  participants: Array<typeof portalSidebarParticipants.$inferSelect>,
): SidebarThread | null {
  const ordered = participants.sort((a, b) => a.position - b.position);
  if (ordered.length !== 2) return null;
  return {
    id: row.id, unionId: row.unionId,
    participantIds: [ordered[0].userId, ordered[1].userId],
    participantNames: [ordered[0].userName, ordered[1].userName],
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSidebarMessage(row: typeof portalSidebarMessages.$inferSelect): SidebarMessage {
  return {
    id: row.id, threadId: row.threadId, unionId: row.unionId,
    authorId: row.authorId, authorName: row.authorName, body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapDispatch(row: typeof portalDispatchItems.$inferSelect): DispatchItem {
  return {
    id: row.id, unionId: row.unionId, userId: row.userId,
    circleId: row.circleId, circleName: row.circleName,
    kind: row.kind as DispatchItem["kind"], title: row.title,
    body: row.body ?? undefined, readAt: iso(row.readAt),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Drizzle persistence for the Local Portal. Every public operation is RLS-scoped. */
export class PostgresPortalAdapter implements PortalAdapter {
  constructor(private readonly rls: RlsSessionContext) {}

  private requireActor(userId: string | undefined, relationship: string): void {
    if (!this.rls.userId || userId !== this.rls.userId) {
      throw new Error(`Portal ${relationship} must match the authenticated actor.`);
    }
  }

  private async activeUnionUser(userId: string, unionId: string): Promise<boolean> {
    const [row] = await getDb().select({ id: users.id }).from(users).where(and(
      eq(users.id, userId), eq(users.unionId, unionId), isNull(users.archivedAt), isNull(users.lockedAt),
    )).limit(1);
    return Boolean(row);
  }

  private scoped<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.rls.unionId || !this.rls.userId) {
      throw new Error("Portal Postgres access requires a resolved actor scope.");
    }
    return withRlsContext(this.rls, fn);
  }

  private sameUnion(unionId: string): boolean {
    return this.rls.unionId === unionId;
  }

  private async circle(circleId: string, unionId: string): Promise<Circle | null> {
    if (!this.sameUnion(unionId)) return null;
    const [row] = await getDb().select().from(portalCircles)
      .where(and(eq(portalCircles.id, circleId), eq(portalCircles.unionId, unionId), isNull(portalCircles.archivedAt))).limit(1);
    return row ? mapCircle(row) : null;
  }

  private async membership(userId: string, circleId: string): Promise<CircleMembership | null> {
    const [row] = await getDb().select().from(portalCircleMemberships)
      .where(and(eq(portalCircleMemberships.userId, userId), eq(portalCircleMemberships.circleId, circleId))).limit(1);
    return row ? mapMembership(row) : null;
  }

  private async audit(input: {
    unionId: string; circleId: string; userId: string; action: string;
    resourceType: string; resourceId: string; metadata?: Record<string, string>;
  }): Promise<void> {
    await getDb().insert(auditLog).values({
      id: makeId("audit"), userId: input.userId, action: input.action,
      resourceType: input.resourceType, resourceId: input.resourceId,
      unionId: input.unionId, circleId: input.circleId,
      metadata: input.metadata ?? null,
      timestamp: instant(),
    });
  }

  async listStation(unionId: string, userId: string): Promise<StationPayload> {
    if (!this.sameUnion(unionId) || this.rls.userId !== userId) return emptyStation();
    return this.scoped(async () => {
      const db = getDb();
      const mineRows = await db.select().from(portalCircleMemberships)
        .where(eq(portalCircleMemberships.userId, userId));
      const memberships = mineRows.map(mapMembership);
      const circleIds = memberships.map((row) => row.circleId);
      if (!circleIds.length) return emptyStation();
      const circleRows = await db.select().from(portalCircles).where(and(
        eq(portalCircles.unionId, unionId), isNull(portalCircles.archivedAt),
        inArray(portalCircles.id, circleIds),
      ));
      const circles = circleRows.map(mapCircle);
      const visibleIds = circles.map((circle) => circle.id);
      if (!visibleIds.length) return emptyStation();
      const [actionRows, bulletinRows, eventRows, dispatchRows, floorRows] = await Promise.all([
        db.select().from(portalActions).where(and(eq(portalActions.unionId, unionId), inArray(portalActions.circleId, visibleIds))),
        db.select().from(portalBulletinPosts).where(and(eq(portalBulletinPosts.unionId, unionId), inArray(portalBulletinPosts.circleId, visibleIds))),
        db.select().from(portalCalendarEvents).where(and(eq(portalCalendarEvents.unionId, unionId), inArray(portalCalendarEvents.circleId, visibleIds))),
        db.select().from(portalDispatchItems).where(and(eq(portalDispatchItems.unionId, unionId), eq(portalDispatchItems.userId, userId))),
        db.select().from(portalFloorMessages).where(and(eq(portalFloorMessages.unionId, unionId), inArray(portalFloorMessages.circleId, visibleIds))),
      ]);
      const actions = actionRows.map(mapAction);
      const bulletins = bulletinRows.map(mapBulletin);
      const events = eventRows.map(mapCalendar);
      const dispatch = dispatchRows.map(mapDispatch);
      const memberByCircle = new Map(memberships.map((member) => [member.circleId, member]));
      const nowIso = instant().toISOString();
      const weekDate = new Date();
      weekDate.setDate(weekDate.getDate() - 7);
      const weekIso = weekDate.toISOString();
      const isMuted = (item: DispatchItem) => {
        const member = memberByCircle.get(item.circleId);
        const tool: PortalToolMute | undefined = item.kind === "bulletin" || item.kind === "mention" ? "bulletin"
          : item.kind === "assignment" || item.kind === "due_soon" ? "actions"
          : item.kind === "roll_call" ? "rollCall" : item.kind === "pipeline" ? "pipeline" : undefined;
        return !member || member.muted || Boolean(tool && member.mutedTools.includes(tool));
      };
      const circlesWithMembership = circles.map((circle) => {
        const membership = memberByCircle.get(circle.id);
        if (!membership) return null;
        const overdueActions = actions.filter((item) => item.circleId === circle.id && !item.completedAt && !item.deletedAt && item.dueAt && item.dueAt < nowIso && (item.assigneeId === userId || membership.role === "admin")).length;
        const dispatchUnread = dispatch.filter((item) => item.circleId === circle.id && !item.readAt && !isMuted(item)).length;
        return { ...circle, membership, overdueActions, dispatchUnread };
      }).filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => Number(b.membership.starred) - Number(a.membership.starred));
      const circleIdSet = new Set(visibleIds);
      const myActions = actions.filter((item) => item.assigneeId === userId && !item.completedAt && !item.deletedAt)
        .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
      const recentBulletin = bulletins.filter((post) => !post.deletedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
      const activeDispatch = dispatch.filter((item) => !item.readAt && !isMuted(item));
      const upcomingEvents = events.filter((event) => event.startsAt >= nowIso)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 4)
        .map((event) => ({ ...event, circleName: circles.find((circle) => circle.id === event.circleId)?.name ?? event.circleId }));
      return {
        circles: circlesWithMembership,
        myActions,
        recentBulletin,
        dispatchUnread: activeDispatch.length,
        upcomingEvents,
        weekDigest: {
          bulletinPosts: bulletins.filter((post) => !post.deletedAt && post.createdAt >= weekIso).length,
          actionsCompleted: actions.filter((item) => item.completedAt && !item.deletedAt && item.completedAt >= weekIso).length,
          floorMessages: floorRows.filter((item) => circleIdSet.has(item.circleId) && item.createdAt.toISOString() >= weekIso).length,
        },
      };
    });
  }

  async getCircleDetail(unionId: string, userId: string, circleId: string): Promise<CircleDetailPayload | null> {
    if (!this.sameUnion(unionId) || this.rls.userId !== userId) return null;
    return this.scoped(async () => {
      const circle = await this.circle(circleId, unionId);
      const membership = await this.membership(userId, circleId);
      if (!circle || !membership) return null;
      const db = getDb();
      const [rosterRows, postRows, actionRows, calendarRows, binderRows, floorRows, questionRows, answerRows, boardRows, momentumRows] = await Promise.all([
        db.select().from(portalCircleMemberships).where(eq(portalCircleMemberships.circleId, circleId)),
        db.select().from(portalBulletinPosts).where(eq(portalBulletinPosts.circleId, circleId)),
        db.select().from(portalActions).where(eq(portalActions.circleId, circleId)),
        db.select().from(portalCalendarEvents).where(eq(portalCalendarEvents.circleId, circleId)),
        db.select().from(portalBinderItems).where(eq(portalBinderItems.circleId, circleId)),
        db.select().from(portalFloorMessages).where(eq(portalFloorMessages.circleId, circleId)),
        db.select().from(portalRollCallQuestions).where(eq(portalRollCallQuestions.circleId, circleId)),
        db.select().from(portalRollCallAnswers).where(eq(portalRollCallAnswers.circleId, circleId)),
        db.select().from(portalPipelineBoards).where(eq(portalPipelineBoards.circleId, circleId)).limit(1),
        db.select().from(portalMomentumItems).where(eq(portalMomentumItems.circleId, circleId)),
      ]);
      const posts = postRows.map(mapBulletin);
      const activePosts = posts.filter((post) => !post.deletedAt);
      const activePostIds = activePosts.map((post) => post.id);
      const commentRows = activePostIds.length ? await db.select().from(portalBulletinComments)
        .where(inArray(portalBulletinComments.postId, activePostIds)) : [];
      const board = boardRows[0];
      const [columnRows, cardRows] = board ? await Promise.all([
        db.select().from(portalPipelineColumns).where(eq(portalPipelineColumns.boardId, board.id)).orderBy(asc(portalPipelineColumns.position)),
        db.select().from(portalPipelineCards).where(eq(portalPipelineCards.boardId, board.id)),
      ]) : [[], []];
      return {
        circle, membership, roster: rosterRows.map(mapMembership),
        bulletin: activePosts.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)),
        comments: commentRows.map((row): BulletinComment => ({
          id: row.id, postId: row.postId, authorId: row.authorId,
          authorName: row.authorName, body: row.body, createdAt: row.createdAt.toISOString(),
        })),
        actions: actionRows.map(mapAction).filter((item) => !item.deletedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        calendar: calendarRows.map(mapCalendar).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
        binder: binderRows.map(mapBinder).filter((item) => !item.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        floor: floorRows.map(mapFloor).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        rollCallQuestions: questionRows.map(mapQuestion), rollCallAnswers: answerRows.map(mapAnswer),
        pipelineBoard: board ? { id: board.id, circleId: board.circleId, unionId: board.unionId, name: board.name } : null,
        pipelineColumns: columnRows.map((row): PipelineColumn => ({ id: row.id, boardId: row.boardId, name: row.name, position: row.position })),
        pipelineCards: cardRows.map((row): PipelineCard => ({ id: row.id, boardId: row.boardId, columnId: row.columnId, title: row.title, body: row.body ?? undefined, position: row.position, createdAt: row.createdAt.toISOString() })),
        momentum: momentumRows.map(mapMomentum).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      };
    });
  }

  async createCircle(input: {
    unionId: string; localId?: string; kind: Circle["kind"]; name: string;
    description?: string; visibility: Circle["visibility"]; createdById: string;
    createdByName: string; template?: "blank" | "lec" | "jhsc" | "campaign";
    frontStartsAt?: string; frontEndsAt?: string;
  }): Promise<Circle> {
    if (!this.sameUnion(input.unionId) || this.rls.userId !== input.createdById) {
      throw new Error("Portal Circle creation scope denied.");
    }
    return this.scoped(async () => {
      const db = getDb();
      const createdAt = instant();
      const row = {
        id: makeId("circle"), unionId: input.unionId, localId: input.localId ?? null,
        kind: input.kind, name: input.name, description: input.description ?? null,
        visibility: input.visibility, frontStartsAt: asDate(input.frontStartsAt),
        frontEndsAt: asDate(input.frontEndsAt), archivedAt: null,
        createdById: input.createdById, createdAt, updatedAt: createdAt,
      };
      const [inserted] = await db.insert(portalCircles).values(row).returning();
      const [membership] = await db.insert(portalCircleMemberships).values({
        id: makeId("cm"), circleId: row.id, userId: input.createdById,
        userName: input.createdByName, role: "admin", muted: false,
        mutedTools: [], starred: true, joinedAt: createdAt,
      }).returning();
      if (!inserted || !membership) throw new Error("Circle setup did not complete.");
      const template = input.template ?? "blank";
      if (["lec", "jhsc", "campaign"].includes(template)) {
        const boardName = template === "jhsc" ? "Inspection walk" : template === "lec" ? "LEC follow-ups" : "Campaign work";
        await this.seedPipelineBoard(row.id, input.unionId, boardName);
        const question = template === "jhsc" ? "Any health & safety issues this week?"
          : template === "lec" ? "Any campus issues that need LEC eyes this week?"
          : "What moved the campaign forward this week?";
        await db.insert(portalRollCallQuestions).values({
          id: makeId("rcq"), circleId: row.id, unionId: input.unionId,
          question, cadence: "weekly", active: true, createdAt,
        });
      }
      return mapCircle(inserted);
    });
  }

  async updateMembership(
    userId: string,
    circleId: string,
    patch: Partial<Pick<CircleMembership, "muted" | "starred" | "role" | "mutedTools">>,
  ): Promise<CircleMembership | null> {
    if (this.rls.userId !== userId) return null;
    return this.scoped(async () => {
      const [row] = await getDb().update(portalCircleMemberships).set({
        ...(patch.muted !== undefined ? { muted: patch.muted } : {}),
        ...(patch.starred !== undefined ? { starred: patch.starred } : {}),
        ...(patch.mutedTools !== undefined ? { mutedTools: patch.mutedTools } : {}),
        ...(patch.role !== undefined ? { role: patch.role } : {}),
      }).where(and(eq(portalCircleMemberships.circleId, circleId), eq(portalCircleMemberships.userId, userId))).returning();
      return row ? mapMembership(row) : null;
    });
  }

  async archiveCircle(circleId: string, unionId: string): Promise<boolean> {
    if (!this.sameUnion(unionId)) return false;
    return this.scoped(async () => {
      const activeCircle = await this.circle(circleId, unionId);
      if (!activeCircle) return false;
      // Audit before setting archived_at: the archive audit policy intentionally
      // requires the actor's active Circle relationship. Both writes share this
      // RLS transaction, so a failed archive rolls the audit row back as well.
      if (this.rls.userId) await this.audit({ unionId, circleId, userId: this.rls.userId,
        action: "circle.archive", resourceType: "circle", resourceId: circleId });
      const archivedAt = instant();
      const [row] = await getDb().update(portalCircles).set({ archivedAt, updatedAt: archivedAt })
        .where(and(eq(portalCircles.id, circleId), eq(portalCircles.unionId, unionId), isNull(portalCircles.archivedAt))).returning({ id: portalCircles.id });
      if (!row) throw new Error("Circle could not be archived.");
      return Boolean(row);
    });
  }

  private async dispatchMuted(userId: string, circleId: string, kind: DispatchItem["kind"]): Promise<boolean> {
    const member = await this.membership(userId, circleId);
    if (!member || member.muted) return true;
    const tool: PortalToolMute | undefined = kind === "bulletin" || kind === "mention" ? "bulletin"
      : kind === "assignment" || kind === "due_soon" ? "actions"
      : kind === "roll_call" ? "rollCall" : kind === "pipeline" ? "pipeline" : undefined;
    return Boolean(tool && member.mutedTools.includes(tool));
  }

  private async dispatch(input: {
    circleId: string; userId: string; kind: DispatchItem["kind"]; title: string; body?: string;
  }): Promise<void> {
    await getDb().execute(sql`select app_create_portal_dispatch(
      ${input.circleId}, ${input.userId}, ${input.kind}, ${input.title}, ${input.body ?? null}
    )`);
  }

  private async notifyMentions(input: {
    text: string; circleId: string; authorId: string; title: string;
  }): Promise<void> {
    const rosterRows = await getDb().select().from(portalCircleMemberships)
      .where(eq(portalCircleMemberships.circleId, input.circleId));
    const roster = rosterRows.map(mapMembership);
    for (const person of resolveMentions(input.text, roster, input.authorId)) {
      if (await this.dispatchMuted(person.userId, input.circleId, "mention")) continue;
      await this.dispatch({
        circleId: input.circleId, userId: person.userId, kind: "mention",
        title: input.title, body: `@${person.userName}`,
      });
    }
  }

  async addBulletin(input: {
    circleId: string; unionId: string; authorId: string; authorName: string; title: string; body: string;
  }): Promise<BulletinPost> {
    this.requireActor(input.authorId, "author");
    if (!this.sameUnion(input.unionId)) throw new Error("Portal Circle scope denied.");
    return this.scoped(async () => {
      const createdAt = instant();
      const [row] = await getDb().insert(portalBulletinPosts).values({
        id: makeId("bp"), ...input, pinned: false, deletedAt: null, createdAt, updatedAt: createdAt,
      }).returning();
      if (!row) throw new Error("Bulletin post was not saved.");
      const roster = await getDb().select().from(portalCircleMemberships)
        .where(eq(portalCircleMemberships.circleId, input.circleId));
      for (const memberRow of roster) {
        if (memberRow.userId === input.authorId || await this.dispatchMuted(memberRow.userId, input.circleId, "bulletin")) continue;
        await this.dispatch({ circleId: input.circleId, userId: memberRow.userId, kind: "bulletin", title: `Bulletin: ${input.title}` });
      }
      await this.notifyMentions({
        text: `${input.title}\n${input.body}`, circleId: input.circleId,
        authorId: input.authorId, title: `Mentioned in Bulletin: ${input.title}`,
      });
      await this.audit({ unionId: input.unionId, circleId: input.circleId, userId: input.authorId,
        action: "bulletin.create", resourceType: "bulletin", resourceId: row.id });
      return mapBulletin(row);
    });
  }

  async addComment(input: {
    circleId: string; unionId: string; postId: string; authorId: string; authorName: string; body: string;
  }): Promise<BulletinComment | null> {
    this.requireActor(input.authorId, "author");
    if (!this.sameUnion(input.unionId)) return null;
    return this.scoped(async () => {
      const [post] = await getDb().select().from(portalBulletinPosts).where(and(
        eq(portalBulletinPosts.id, input.postId), eq(portalBulletinPosts.circleId, input.circleId),
        eq(portalBulletinPosts.unionId, input.unionId), isNull(portalBulletinPosts.deletedAt),
      )).limit(1);
      if (!post) return null;
      const [row] = await getDb().insert(portalBulletinComments).values({
        id: makeId("bc"), postId: input.postId, authorId: input.authorId,
        authorName: input.authorName, body: input.body, createdAt: instant(),
      }).returning();
      if (!row) return null;
      await this.notifyMentions({ text: input.body, circleId: input.circleId,
        authorId: input.authorId, title: `Mentioned in comment: ${post.title}` });
      return { id: row.id, postId: row.postId, authorId: row.authorId,
        authorName: row.authorName, body: row.body, createdAt: row.createdAt.toISOString() };
    });
  }

  async addAction(input: {
    circleId: string; unionId: string; listName: string; title: string; notes?: string;
    assigneeId?: string; assigneeName?: string; dueAt?: string; createdById: string; sourceBulletinPostId?: string;
  }): Promise<ActionItem> {
    this.requireActor(input.createdById, "creator");
    if (!this.sameUnion(input.unionId)) throw new Error("Portal Circle scope denied.");
    return this.scoped(async () => {
      const assignee = input.assigneeId ? await this.membership(input.assigneeId, input.circleId) : null;
      if (input.assigneeId && !assignee) throw new Error("Action assignee must be an active Circle member.");
      const createdAt = instant();
      const [row] = await getDb().insert(portalActions).values({
        id: makeId("act"), circleId: input.circleId, unionId: input.unionId,
        listName: input.listName, title: input.title, notes: input.notes ?? null,
        assigneeId: input.assigneeId ?? null, assigneeName: assignee?.userName ?? null,
        dueAt: asDate(input.dueAt), completedAt: null, deletedAt: null,
        sourceBulletinPostId: input.sourceBulletinPostId ?? null,
        createdById: input.createdById, createdAt, updatedAt: createdAt,
      }).returning();
      if (!row) throw new Error("Action was not saved.");
      if (input.assigneeId && input.assigneeId !== input.createdById) {
        await this.dispatch({ circleId: input.circleId, userId: input.assigneeId, kind: "assignment", title: `Action assigned: ${input.title}` });
      }
      return mapAction(row);
    });
  }

  async completeAction(actionId: string, circleId: string, unionId: string): Promise<ActionItem | null> {
    if (!this.sameUnion(unionId)) return null;
    return this.scoped(async () => {
      const completedAt = instant();
      const [row] = await getDb().update(portalActions).set({ completedAt, updatedAt: completedAt })
        .where(and(eq(portalActions.id, actionId), eq(portalActions.circleId, circleId), eq(portalActions.unionId, unionId), isNull(portalActions.deletedAt))).returning();
      return row ? mapAction(row) : null;
    });
  }

  async addCalendarEvent(input: {
    circleId: string; unionId: string; title: string; description?: string; startsAt: string;
    endsAt?: string; location?: string; externalUrl?: string; createdById: string;
  }): Promise<CalendarEvent> {
    this.requireActor(input.createdById, "creator");
    if (!this.sameUnion(input.unionId)) throw new Error("Portal Circle scope denied.");
    return this.scoped(async () => {
      const [row] = await getDb().insert(portalCalendarEvents).values({
        id: makeId("cal"), circleId: input.circleId, unionId: input.unionId,
        title: input.title, description: input.description ?? null,
        startsAt: new Date(input.startsAt), endsAt: asDate(input.endsAt),
        location: input.location ?? null, externalUrl: input.externalUrl ?? null,
        createdById: input.createdById, createdAt: instant(),
      }).returning();
      if (!row) throw new Error("Calendar event was not saved.");
      return mapCalendar(row);
    });
  }

  async addBinderItem(input: {
    circleId: string; unionId: string; title: string; folder?: string; content: string;
    contentType: BinderItem["contentType"]; createdById: string; createdByName: string;
  }): Promise<BinderItem> {
    this.requireActor(input.createdById, "creator");
    if (!this.sameUnion(input.unionId)) throw new Error("Portal Circle scope denied.");
    return this.scoped(async () => {
      const [row] = await getDb().insert(portalBinderItems).values({
        id: makeId("bind"), circleId: input.circleId, unionId: input.unionId,
        title: input.title, folder: input.folder ?? null, content: input.content,
        contentType: input.contentType, createdById: input.createdById,
        createdByName: input.createdByName, deletedAt: null, createdAt: instant(),
      }).returning();
      if (!row) throw new Error("Binder item was not saved.");
      return mapBinder(row);
    });
  }

  async addFloorMessage(input: {
    circleId: string; unionId: string; authorId: string; authorName: string; body: string;
  }): Promise<FloorMessage> {
    this.requireActor(input.authorId, "author");
    if (!this.sameUnion(input.unionId)) throw new Error("Portal Circle scope denied.");
    return this.scoped(async () => {
      const [row] = await getDb().insert(portalFloorMessages).values({
        id: makeId("fl"), ...input, createdAt: instant(),
      }).returning();
      if (!row) throw new Error("Floor message was not saved.");
      await this.notifyMentions({ text: input.body, circleId: input.circleId,
        authorId: input.authorId, title: "Mentioned on the Floor" });
      return mapFloor(row);
    });
  }

  async addRollCallAnswer(input: {
    questionId: string; circleId: string; authorId: string; authorName: string; body: string;
  }): Promise<RollCallAnswer | null> {
    this.requireActor(input.authorId, "author");
    return this.scoped(async () => {
      const [question] = await getDb().select({ unionId: portalRollCallQuestions.unionId })
        .from(portalRollCallQuestions).where(and(eq(portalRollCallQuestions.id, input.questionId),
          eq(portalRollCallQuestions.circleId, input.circleId), eq(portalRollCallQuestions.active, true))).limit(1);
      if (!question || !this.sameUnion(question.unionId)) return null;
      const [row] = await getDb().insert(portalRollCallAnswers).values({
        id: makeId("rca"), ...input, createdAt: instant(),
      }).returning();
      return row ? mapAnswer(row) : null;
    });
  }

  private async seedPipelineBoard(circleId: string, unionId: string, name: string): Promise<PipelineBoard> {
    const db = getDb();
    const [existing] = await db.select().from(portalPipelineBoards)
      .where(and(eq(portalPipelineBoards.circleId, circleId), eq(portalPipelineBoards.unionId, unionId))).limit(1);
    if (existing) return { id: existing.id, circleId: existing.circleId, unionId: existing.unionId, name: existing.name };
    const id = makeId("pipe");
    const [board] = await db.insert(portalPipelineBoards).values({ id, circleId, unionId, name }).returning();
    if (!board) throw new Error("Many hands board was not saved.");
    await db.insert(portalPipelineColumns).values(["Backlog", "In progress", "Done"].map((column, position) => ({
      id: makeId("col"), boardId: id, name: column, position,
    })));
    return { id: board.id, circleId: board.circleId, unionId: board.unionId, name: board.name };
  }

  async movePipelineCard(cardId: string, columnId: string, circleId: string, unionId: string): Promise<PipelineCard | null> {
    if (!this.sameUnion(unionId)) return null;
    return this.scoped(async () => {
      const db = getDb();
      const [card] = await db.select().from(portalPipelineCards).where(eq(portalPipelineCards.id, cardId)).limit(1);
      if (!card) return null;
      const [board] = await db.select().from(portalPipelineBoards).where(and(
        eq(portalPipelineBoards.id, card.boardId), eq(portalPipelineBoards.circleId, circleId), eq(portalPipelineBoards.unionId, unionId),
      )).limit(1);
      const [column] = await db.select().from(portalPipelineColumns).where(and(
        eq(portalPipelineColumns.id, columnId), eq(portalPipelineColumns.boardId, card.boardId),
      )).limit(1);
      if (!board || !column) return null;
      const [updated] = await db.update(portalPipelineCards).set({ columnId })
        .where(eq(portalPipelineCards.id, cardId)).returning();
      return updated ? {
        id: updated.id, boardId: updated.boardId, columnId: updated.columnId,
        title: updated.title, body: updated.body ?? undefined, position: updated.position,
        createdAt: updated.createdAt.toISOString(),
      } : null;
    });
  }

  async ensurePipelineBoard(input: { circleId: string; unionId: string; name?: string }): Promise<PipelineBoard | null> {
    if (!this.sameUnion(input.unionId)) return null;
    return this.scoped(async () => {
      const circle = await this.circle(input.circleId, input.unionId);
      if (!circle || circle.archivedAt) return null;
      return this.seedPipelineBoard(input.circleId, input.unionId, input.name?.trim() || circle.name);
    });
  }

  async addPipelineCard(input: {
    circleId: string; unionId: string; boardId: string; columnId: string; title: string; body?: string;
  }): Promise<PipelineCard | null> {
    if (!this.sameUnion(input.unionId)) return null;
    return this.scoped(async () => {
      const db = getDb();
      const [board] = await db.select().from(portalPipelineBoards).where(and(
        eq(portalPipelineBoards.id, input.boardId), eq(portalPipelineBoards.circleId, input.circleId), eq(portalPipelineBoards.unionId, input.unionId),
      )).limit(1);
      const [column] = await db.select().from(portalPipelineColumns).where(and(
        eq(portalPipelineColumns.id, input.columnId), eq(portalPipelineColumns.boardId, input.boardId),
      )).limit(1);
      if (!board || !column) return null;
      const existing = await db.select({ position: portalPipelineCards.position }).from(portalPipelineCards)
        .where(eq(portalPipelineCards.columnId, input.columnId)).orderBy(desc(portalPipelineCards.position)).limit(1);
      const [row] = await db.insert(portalPipelineCards).values({
        id: makeId("pc"), boardId: input.boardId, columnId: input.columnId,
        title: input.title, body: input.body ?? null, position: (existing[0]?.position ?? -1) + 1, createdAt: instant(),
      }).returning();
      return row ? {
        id: row.id, boardId: row.boardId, columnId: row.columnId, title: row.title,
        body: row.body ?? undefined, position: row.position, createdAt: row.createdAt.toISOString(),
      } : null;
    });
  }

  async listDispatch(unionId: string, userId: string): Promise<DispatchItem[]> {
    if (!this.sameUnion(unionId) || this.rls.userId !== userId) return [];
    return this.scoped(async () => {
      const rows = await getDb().select().from(portalDispatchItems).where(and(
        eq(portalDispatchItems.unionId, unionId), eq(portalDispatchItems.userId, userId),
      )).orderBy(desc(portalDispatchItems.createdAt));
      const items: DispatchItem[] = [];
      for (const row of rows) {
        if (!await this.dispatchMuted(userId, row.circleId, row.kind as DispatchItem["kind"])) items.push(mapDispatch(row));
      }
      return items;
    });
  }

  async markDispatchRead(unionId: string, userId: string, ids?: string[]): Promise<number> {
    if (!this.sameUnion(unionId) || this.rls.userId !== userId) return 0;
    return this.scoped(async () => {
      const filters = [eq(portalDispatchItems.unionId, unionId), eq(portalDispatchItems.userId, userId), isNull(portalDispatchItems.readAt)];
      if (ids) {
        if (!ids.length) return 0;
        filters.push(inArray(portalDispatchItems.id, ids));
      }
      const changed = await getDb().update(portalDispatchItems).set({ readAt: instant() })
        .where(and(...filters)).returning({ id: portalDispatchItems.id });
      return changed.length;
    });
  }

  async oversight(circleId: string, unionId: string): Promise<{ overdue: ActionItem[]; unassigned: ActionItem[]; doneToday: ActionItem[]; openCount: number }> {
    if (!this.sameUnion(unionId)) return { overdue: [], unassigned: [], doneToday: [], openCount: 0 };
    return this.scoped(async () => {
      const rows = await getDb().select().from(portalActions).where(and(
        eq(portalActions.circleId, circleId), eq(portalActions.unionId, unionId),
      ));
      const actions = rows.map(mapAction).filter((item) => !item.deletedAt);
      const today = instant().toISOString().slice(0, 10);
      const open = actions.filter((item) => !item.completedAt);
      return {
        overdue: open.filter((item) => item.dueAt && item.dueAt < instant().toISOString()),
        unassigned: open.filter((item) => !item.assigneeId),
        doneToday: actions.filter((item) => item.completedAt?.slice(0, 10) === today),
        openCount: open.length,
      };
    });
  }

  async softDelete(
    resourceType: "bulletin" | "action" | "binder", resourceId: string,
    circleId: string, unionId: string, userId: string,
  ): Promise<boolean> {
    this.requireActor(userId, "delete actor");
    if (!this.sameUnion(unionId)) return false;
    return this.scoped(async () => {
      const db = getDb();
      let changed = false;
      const at = instant();
      if (resourceType === "bulletin") {
        const [row] = await db.update(portalBulletinPosts).set({ deletedAt: at, updatedAt: at })
          .where(and(eq(portalBulletinPosts.id, resourceId), eq(portalBulletinPosts.circleId, circleId), eq(portalBulletinPosts.unionId, unionId), isNull(portalBulletinPosts.deletedAt))).returning({ id: portalBulletinPosts.id });
        changed = Boolean(row);
      } else if (resourceType === "action") {
        const [row] = await db.update(portalActions).set({ deletedAt: at, updatedAt: at })
          .where(and(eq(portalActions.id, resourceId), eq(portalActions.circleId, circleId), eq(portalActions.unionId, unionId), isNull(portalActions.deletedAt))).returning({ id: portalActions.id });
        changed = Boolean(row);
      } else {
        const [row] = await db.update(portalBinderItems).set({ deletedAt: at })
          .where(and(eq(portalBinderItems.id, resourceId), eq(portalBinderItems.circleId, circleId), eq(portalBinderItems.unionId, unionId), isNull(portalBinderItems.deletedAt))).returning({ id: portalBinderItems.id });
        changed = Boolean(row);
      }
      if (changed) await this.audit({ unionId, circleId, userId, action: `${resourceType}.soft_delete`, resourceType, resourceId });
      return changed;
    });
  }

  async listAudit(circleId: string, unionId: string, limit = 40): Promise<PortalAuditEntry[]> {
    if (!this.sameUnion(unionId)) return [];
    return this.scoped(async () => {
      const rows = await getDb().select().from(auditLog).where(and(
        eq(auditLog.unionId, unionId), eq(auditLog.circleId, circleId),
      )).orderBy(desc(auditLog.timestamp)).limit(limit);
      return rows.map((row): PortalAuditEntry => ({
        id: row.id, unionId: row.unionId ?? unionId, circleId,
        userId: row.userId, action: row.action, resourceType: row.resourceType,
        resourceId: row.resourceId, createdAt: row.timestamp.toISOString(),
        metadata: row.metadata ?? undefined,
      }));
    });
  }

  async exportActivityPack(circleId: string, unionId: string) {
    const detail = await this.getExportDetail(circleId, unionId);
    return detail;
  }

  private async getExportDetail(circleId: string, unionId: string) {
    if (!this.sameUnion(unionId)) return null;
    return this.scoped(async () => {
      const circle = await this.circle(circleId, unionId);
      if (!circle) return null;
      const detail = await this.getCircleDetailInScope(circle, circleId);
      if (!detail) return null;
      const audit = await this.listAuditInScope(circleId, unionId, 100);
      return {
        exportedAt: instant().toISOString(), circle, roster: detail.roster,
        bulletin: detail.bulletin, comments: detail.comments, actions: detail.actions,
        calendar: detail.calendar, binder: detail.binder, floor: detail.floor,
        momentum: detail.momentum, audit,
      };
    });
  }

  private async getCircleDetailInScope(circle: Circle, circleId: string): Promise<CircleDetailPayload | null> {
    const userId = this.rls.userId!;
    const [membership] = await getDb().select().from(portalCircleMemberships).where(and(
      eq(portalCircleMemberships.circleId, circleId), eq(portalCircleMemberships.userId, userId),
    )).limit(1);
    if (!membership) return null;
    const [rosterRows, postRows, actionRows, calendarRows, binderRows, floorRows, questionRows, answerRows, boardRows, momentumRows] = await Promise.all([
      getDb().select().from(portalCircleMemberships).where(eq(portalCircleMemberships.circleId, circleId)),
      getDb().select().from(portalBulletinPosts).where(eq(portalBulletinPosts.circleId, circleId)),
      getDb().select().from(portalActions).where(eq(portalActions.circleId, circleId)),
      getDb().select().from(portalCalendarEvents).where(eq(portalCalendarEvents.circleId, circleId)),
      getDb().select().from(portalBinderItems).where(eq(portalBinderItems.circleId, circleId)),
      getDb().select().from(portalFloorMessages).where(eq(portalFloorMessages.circleId, circleId)),
      getDb().select().from(portalRollCallQuestions).where(eq(portalRollCallQuestions.circleId, circleId)),
      getDb().select().from(portalRollCallAnswers).where(eq(portalRollCallAnswers.circleId, circleId)),
      getDb().select().from(portalPipelineBoards).where(eq(portalPipelineBoards.circleId, circleId)).limit(1),
      getDb().select().from(portalMomentumItems).where(eq(portalMomentumItems.circleId, circleId)),
    ]);
    const posts = postRows.map(mapBulletin).filter((post) => !post.deletedAt);
    const postIds = posts.map((post) => post.id);
    const commentRows = postIds.length ? await getDb().select().from(portalBulletinComments).where(inArray(portalBulletinComments.postId, postIds)) : [];
    const board = boardRows[0];
    const [columnRows, cardRows] = board ? await Promise.all([
      getDb().select().from(portalPipelineColumns).where(eq(portalPipelineColumns.boardId, board.id)).orderBy(asc(portalPipelineColumns.position)),
      getDb().select().from(portalPipelineCards).where(eq(portalPipelineCards.boardId, board.id)),
    ]) : [[], []];
    return {
      circle, membership: mapMembership(membership), roster: rosterRows.map(mapMembership),
      bulletin: posts.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)),
      comments: commentRows.map((row): BulletinComment => ({ id: row.id, postId: row.postId, authorId: row.authorId, authorName: row.authorName, body: row.body, createdAt: row.createdAt.toISOString() })),
      actions: actionRows.map(mapAction).filter((item) => !item.deletedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      calendar: calendarRows.map(mapCalendar).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      binder: binderRows.map(mapBinder).filter((item) => !item.deletedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      floor: floorRows.map(mapFloor).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      rollCallQuestions: questionRows.map(mapQuestion), rollCallAnswers: answerRows.map(mapAnswer),
      pipelineBoard: board ? { id: board.id, circleId: board.circleId, unionId: board.unionId, name: board.name } : null,
      pipelineColumns: columnRows.map((row): PipelineColumn => ({ id: row.id, boardId: row.boardId, name: row.name, position: row.position })),
      pipelineCards: cardRows.map((row): PipelineCard => ({ id: row.id, boardId: row.boardId, columnId: row.columnId, title: row.title, body: row.body ?? undefined, position: row.position, createdAt: row.createdAt.toISOString() })),
      momentum: momentumRows.map(mapMomentum).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    };
  }

  private async listAuditInScope(circleId: string, unionId: string, limit: number): Promise<PortalAuditEntry[]> {
    const rows = await getDb().select().from(auditLog).where(and(eq(auditLog.unionId, unionId), eq(auditLog.circleId, circleId)))
      .orderBy(desc(auditLog.timestamp)).limit(limit);
    return rows.map((row): PortalAuditEntry => ({
      id: row.id, unionId: row.unionId ?? unionId, circleId, userId: row.userId,
      action: row.action, resourceType: row.resourceType, resourceId: row.resourceId,
      createdAt: row.timestamp.toISOString(), metadata: row.metadata ?? undefined,
    }));
  }

  async importBasecampRows(circleId: string, unionId: string, authorId: string, authorName: string, rows: BasecampImportRow[]): Promise<{ created: number }> {
    this.requireActor(authorId, "import author");
    if (!this.sameUnion(unionId) || this.rls.userId !== authorId) return { created: 0 };
    return this.scoped(async () => {
      let created = 0;
      for (const row of rows) {
        if (row.kind === "bulletin") {
          await this.addBulletin({ circleId, unionId, authorId, authorName, title: row.title, body: row.body || "(imported)" });
        } else if (row.kind === "action") {
          await this.addAction({ circleId, unionId, listName: "Imported", title: row.title, notes: row.body || undefined, createdById: authorId });
        } else {
          await this.addBinderItem({ circleId, unionId, title: row.title, content: row.body || "(imported)", contentType: "note", createdById: authorId, createdByName: authorName });
        }
        created += 1;
      }
      await this.audit({ unionId, circleId, userId: authorId, action: "circle.basecamp_import", resourceType: "circle", resourceId: circleId, metadata: { count: String(created) } });
      return { created };
    });
  }

  async importBasecampCsv(circleId: string, unionId: string, authorId: string, authorName: string, csv: string): Promise<{ created: number; rows: number }> {
    const rows = parseBasecampCsv(csv);
    const result = await this.importBasecampRows(circleId, unionId, authorId, authorName, rows);
    return { created: result.created, rows: rows.length };
  }

  async pinBulletin(postId: string, circleId: string, unionId: string, pinned: boolean): Promise<BulletinPost | null> {
    if (!this.sameUnion(unionId)) return null;
    return this.scoped(async () => {
      const [row] = await getDb().update(portalBulletinPosts).set({ pinned, updatedAt: instant() })
        .where(and(eq(portalBulletinPosts.id, postId), eq(portalBulletinPosts.circleId, circleId), eq(portalBulletinPosts.unionId, unionId), isNull(portalBulletinPosts.deletedAt))).returning();
      return row ? mapBulletin(row) : null;
    });
  }

  async upsertMomentum(input: {
    id?: string; circleId: string; unionId: string; title: string; notes?: string;
    progress: number; updatedById: string; updatedByName: string;
  }): Promise<MomentumItem | null> {
    this.requireActor(input.updatedById, "momentum editor");
    if (!this.sameUnion(input.unionId)) return null;
    return this.scoped(async () => {
      const db = getDb();
      const updatedAt = instant();
      const progress = Math.max(0, Math.min(100, Math.round(input.progress)));
      if (input.id) {
        const [row] = await db.update(portalMomentumItems).set({
          title: input.title, notes: input.notes ?? null, progress,
          updatedById: input.updatedById, updatedByName: input.updatedByName, updatedAt,
        }).where(and(eq(portalMomentumItems.id, input.id), eq(portalMomentumItems.circleId, input.circleId), eq(portalMomentumItems.unionId, input.unionId))).returning();
        return row ? mapMomentum(row) : null;
      }
      const [row] = await db.insert(portalMomentumItems).values({
        id: makeId("mom"), circleId: input.circleId, unionId: input.unionId,
        title: input.title, notes: input.notes ?? null, progress,
        updatedById: input.updatedById, updatedByName: input.updatedByName,
        createdAt: updatedAt, updatedAt,
      }).returning();
      return row ? mapMomentum(row) : null;
    });
  }

  async inviteToRoster(input: {
    circleId: string; userId: string; userName: string; role?: CircleMembership["role"];
  }): Promise<CircleMembership | null> {
    return this.scoped(async () => {
      if (!this.rls.unionId || !(await this.activeUnionUser(input.userId, this.rls.unionId))) return null;
      const existing = await this.membership(input.userId, input.circleId);
      if (existing) return existing;
      const [circle] = await getDb().select().from(portalCircles).where(eq(portalCircles.id, input.circleId)).limit(1);
      if (!circle || circle.archivedAt || !this.sameUnion(circle.unionId)) return null;
      const [row] = await getDb().insert(portalCircleMemberships).values({
        id: makeId("cm"), circleId: input.circleId, userId: input.userId,
        userName: input.userName, role: input.role ?? "member", muted: false,
        mutedTools: [], starred: false, joinedAt: instant(),
      }).onConflictDoNothing({ target: [portalCircleMemberships.circleId, portalCircleMemberships.userId] }).returning();
      return row ? mapMembership(row) : this.membership(input.userId, input.circleId);
    });
  }

  async ensureHall(input: { unionId: string; localId: string; localNumber?: string }): Promise<Circle> {
    if (!this.sameUnion(input.unionId) || !this.rls.userId) throw new Error("Local Hall scope denied.");
    return this.scoped(async () => {
      await getDb().execute(sql`select app_sync_local_portal_membership(${input.unionId}, ${input.localId}, ${this.rls.userId})`);
      const [row] = await getDb().select().from(portalCircles).where(and(
        eq(portalCircles.unionId, input.unionId), eq(portalCircles.localId, input.localId),
        eq(portalCircles.kind, "local_hall"), isNull(portalCircles.archivedAt),
      )).orderBy(asc(portalCircles.createdAt)).limit(1);
      if (!row) throw new Error("Local Hall could not be materialized.");
      return mapCircle(row);
    });
  }

  async ensureHallAndJoin(input: {
    unionId: string; localId: string; localNumber?: string; userId: string; userName: string; admin?: boolean;
  }): Promise<{ circle: Circle; membership: CircleMembership }> {
    if (!this.sameUnion(input.unionId)) throw new Error("Local Hall scope denied.");
    return this.scoped(async () => {
      await getDb().execute(sql`select app_sync_local_portal_membership(${input.unionId}, ${input.localId}, ${input.userId})`);
      const [circleRow] = await getDb().select().from(portalCircles).where(and(
        eq(portalCircles.unionId, input.unionId), eq(portalCircles.localId, input.localId),
        eq(portalCircles.kind, "local_hall"), isNull(portalCircles.archivedAt),
      )).orderBy(asc(portalCircles.createdAt)).limit(1);
      if (!circleRow) throw new Error("Local Hall could not be materialized.");
      const member = await this.membership(input.userId, circleRow.id);
      if (!member) throw new Error("Active local membership is required for Hall access.");
      return { circle: mapCircle(circleRow), membership: member };
    });
  }

  async addRollCallQuestion(input: {
    circleId: string; unionId: string; question: string; cadence?: RollCallQuestion["cadence"];
  }): Promise<RollCallQuestion> {
    if (!this.sameUnion(input.unionId)) throw new Error("Portal Circle scope denied.");
    return this.scoped(async () => {
      const [row] = await getDb().insert(portalRollCallQuestions).values({
        id: makeId("rcq"), circleId: input.circleId, unionId: input.unionId,
        question: input.question, cadence: input.cadence ?? "weekly", active: true, createdAt: instant(),
      }).returning();
      if (!row) throw new Error("Roll Call question was not saved.");
      return mapQuestion(row);
    });
  }

  async listFronts(unionId: string, userId: string): Promise<Circle[]> {
    if (!this.sameUnion(unionId) || this.rls.userId !== userId) return [];
    return this.scoped(async () => {
      const rows = await getDb().select({ circle: portalCircles }).from(portalCircles)
        .innerJoin(portalCircleMemberships, eq(portalCircleMemberships.circleId, portalCircles.id))
        .where(and(eq(portalCircles.unionId, unionId), eq(portalCircleMemberships.userId, userId),
          isNull(portalCircles.archivedAt), or(sql`${portalCircles.frontStartsAt} IS NOT NULL`, sql`${portalCircles.frontEndsAt} IS NOT NULL`)))
        .orderBy(asc(portalCircles.frontStartsAt));
      return rows.map((row) => mapCircle(row.circle));
    });
  }

  async setFrontDates(circleId: string, unionId: string, frontStartsAt?: string, frontEndsAt?: string): Promise<Circle | null> {
    if (!this.sameUnion(unionId)) return null;
    return this.scoped(async () => {
      const [row] = await getDb().update(portalCircles).set({
        frontStartsAt: asDate(frontStartsAt), frontEndsAt: asDate(frontEndsAt), updatedAt: instant(),
      }).where(and(eq(portalCircles.id, circleId), eq(portalCircles.unionId, unionId), isNull(portalCircles.archivedAt))).returning();
      return row ? mapCircle(row) : null;
    });
  }

  async listSidebarThreads(unionId: string, userId: string): Promise<SidebarThread[]> {
    if (!this.sameUnion(unionId) || this.rls.userId !== userId) return [];
    return this.scoped(async () => {
      const rows = await getDb().select().from(portalSidebarThreads)
        .where(eq(portalSidebarThreads.unionId, unionId)).orderBy(desc(portalSidebarThreads.updatedAt));
      const threads: SidebarThread[] = [];
      for (const row of rows) {
        const participants = await getDb().select().from(portalSidebarParticipants).where(eq(portalSidebarParticipants.threadId, row.id));
        const thread = mapSidebarThread(row, participants);
        if (thread?.participantIds.includes(userId)) threads.push(thread);
      }
      return threads;
    });
  }

  async getSidebarMessages(unionId: string, userId: string, threadId: string): Promise<SidebarMessage[] | null> {
    if (!this.sameUnion(unionId) || this.rls.userId !== userId) return null;
    return this.scoped(async () => {
      const [thread] = await getDb().select().from(portalSidebarThreads).where(and(
        eq(portalSidebarThreads.id, threadId), eq(portalSidebarThreads.unionId, unionId),
      )).limit(1);
      if (!thread) return null;
      const [participant] = await getDb().select({ id: portalSidebarParticipants.id }).from(portalSidebarParticipants)
        .where(and(eq(portalSidebarParticipants.threadId, threadId), eq(portalSidebarParticipants.userId, userId))).limit(1);
      if (!participant) return null;
      const rows = await getDb().select().from(portalSidebarMessages)
        .where(eq(portalSidebarMessages.threadId, threadId)).orderBy(asc(portalSidebarMessages.createdAt));
      return rows.map(mapSidebarMessage);
    });
  }

  async ensureSidebarThread(input: {
    unionId: string; fromId: string; fromName: string; toId: string; toName: string;
  }): Promise<SidebarThread> {
    if (!this.sameUnion(input.unionId) || this.rls.userId !== input.fromId) throw new Error("Sidebar participant scope denied.");
    return this.scoped(async () => {
      if (!(await this.activeUnionUser(input.toId, input.unionId))) throw new Error("Sidebar recipient must be an active account in this union.");
      const db = getDb();
      const participantPairKey = [input.fromId, input.toId].sort().join("\u001f");
      // Serialize the read-or-create sequence so simultaneous requests cannot
      // create duplicate conversations for the same pair.
      await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.unionId}\u001e${participantPairKey}`}, 0))`);
      const [existing] = await db.select().from(portalSidebarThreads).where(and(
        eq(portalSidebarThreads.unionId, input.unionId),
        eq(portalSidebarThreads.participantPairKey, participantPairKey),
      )).limit(1);
      if (existing) {
        const participants = await db.select().from(portalSidebarParticipants).where(eq(portalSidebarParticipants.threadId, existing.id));
        const thread = mapSidebarThread(existing, participants);
        if (thread) return thread;
      }
      const id = makeId("sb");
      const updatedAt = instant();
      const [row] = await db.insert(portalSidebarThreads).values({
        id, unionId: input.unionId, participantPairKey, createdById: input.fromId, updatedAt,
      }).returning();
      if (!row) throw new Error("Sidebar conversation was not saved.");
      const participants = [
        { id: makeId("sbp"), threadId: id, userId: input.fromId, userName: input.fromName, position: 0 },
        { id: makeId("sbp"), threadId: id, userId: input.toId, userName: input.toName, position: 1 },
      ];
      await db.insert(portalSidebarParticipants).values(participants);
      const thread = mapSidebarThread(row, participants.map((participant) => ({ ...participant })) as Array<typeof portalSidebarParticipants.$inferSelect>);
      if (!thread) throw new Error("Sidebar participants were not saved.");
      return thread;
    });
  }

  private async listSidebarThreadsInScope(unionId: string, userId: string): Promise<SidebarThread[]> {
    const rows = await getDb().select().from(portalSidebarThreads).where(eq(portalSidebarThreads.unionId, unionId));
    const threads: SidebarThread[] = [];
    for (const row of rows) {
      const participants = await getDb().select().from(portalSidebarParticipants).where(eq(portalSidebarParticipants.threadId, row.id));
      const thread = mapSidebarThread(row, participants);
      if (thread?.participantIds.includes(userId)) threads.push(thread);
    }
    return threads;
  }

  async sendSidebarMessage(input: {
    unionId: string; threadId: string; authorId: string; authorName: string; body: string;
  }): Promise<SidebarMessage | null> {
    if (!this.sameUnion(input.unionId) || this.rls.userId !== input.authorId) return null;
    return this.scoped(async () => {
      const [participant] = await getDb().select({ id: portalSidebarParticipants.id }).from(portalSidebarParticipants)
        .where(and(eq(portalSidebarParticipants.threadId, input.threadId), eq(portalSidebarParticipants.userId, input.authorId))).limit(1);
      if (!participant) return null;
      const createdAt = instant();
      const [row] = await getDb().insert(portalSidebarMessages).values({
        id: makeId("sbm"), threadId: input.threadId, unionId: input.unionId,
        authorId: input.authorId, authorName: input.authorName, body: input.body, createdAt,
      }).returning();
      if (!row) return null;
      await getDb().update(portalSidebarThreads).set({ updatedAt: createdAt })
        .where(eq(portalSidebarThreads.id, input.threadId));
      return mapSidebarMessage(row);
    });
  }

  async search(unionId: string, userId: string, query: string): Promise<PortalSearchHit[]> {
    if (!this.sameUnion(unionId) || this.rls.userId !== userId) return [];
    const q = query.trim().toLocaleLowerCase();
    if (!q) return [];
    return this.scoped(async () => {
      const db = getDb();
      const circles = (await db.select().from(portalCircles).where(and(
        eq(portalCircles.unionId, unionId), isNull(portalCircles.archivedAt),
      ))).map(mapCircle);
      const ids = circles.map((circle) => circle.id);
      if (!ids.length) return [];
      const [posts, actionRows, binderRows] = await Promise.all([
        db.select().from(portalBulletinPosts).where(inArray(portalBulletinPosts.circleId, ids)),
        db.select().from(portalActions).where(inArray(portalActions.circleId, ids)),
        db.select().from(portalBinderItems).where(inArray(portalBinderItems.circleId, ids)),
      ]);
      const circleName = new Map(circles.map((circle) => [circle.id, circle.name]));
      const hits: PortalSearchHit[] = [];
      const contains = (...values: Array<string | undefined>) => values.some((value) => value?.toLocaleLowerCase().includes(q));
      for (const circle of circles) if (contains(circle.name)) hits.push({ kind: "circle", id: circle.id, circleId: circle.id, circleName: circle.name, title: circle.name, snippet: circle.description ?? circle.kind });
      for (const row of posts) if (!row.deletedAt && contains(row.title, row.body)) hits.push({ kind: "bulletin", id: row.id, circleId: row.circleId, circleName: circleName.get(row.circleId) ?? "Circle", title: row.title, snippet: row.body.slice(0, 120) });
      for (const row of actionRows) if (!row.deletedAt && contains(row.title)) hits.push({ kind: "action", id: row.id, circleId: row.circleId, circleName: circleName.get(row.circleId) ?? "Circle", title: row.title, snippet: row.listName });
      for (const row of binderRows) if (!row.deletedAt && contains(row.title, row.content)) hits.push({ kind: "binder", id: row.id, circleId: row.circleId, circleName: circleName.get(row.circleId) ?? "Circle", title: row.title, snippet: row.content.slice(0, 120) });
      return hits.slice(0, 40);
    });
  }
}

function emptyStation(): StationPayload {
  return {
    circles: [], myActions: [], recentBulletin: [], dispatchUnread: 0,
    upcomingEvents: [], weekDigest: { bulletinPosts: 0, actionsCompleted: 0, floorMessages: 0 },
  };
}
