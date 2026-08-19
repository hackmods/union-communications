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
import { resolveMentions } from "@/lib/portal/mentions";
import {
  parseBasecampCsv,
  type BasecampImportRow,
} from "@/lib/portal/basecamp-import";

function now() {
  return new Date().toISOString();
}

function daysFromNow(days: number, hours = 12): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const UNION = "union-opseu";
const LOCAL = "local-243";

const hall: Circle = {
  id: "circle-hall-243",
  unionId: UNION,
  localId: LOCAL,
  kind: "local_hall",
  name: "Local 243 Hall",
  description: "Default Hall for Local 243 members and officers.",
  visibility: "local_members",
  frontStartsAt: "2026-01-01T00:00:00.000Z",
  frontEndsAt: "2026-12-31T23:59:59.000Z",
  createdById: "user-president-243",
  createdAt: "2026-07-01T12:00:00.000Z",
  updatedAt: "2026-07-01T12:00:00.000Z",
};

const lec: Circle = {
  id: "circle-lec-243",
  unionId: UNION,
  localId: LOCAL,
  kind: "committee",
  name: "LEC",
  description: "Local Executive Committee.",
  visibility: "invited",
  frontStartsAt: "2026-07-01T00:00:00.000Z",
  frontEndsAt: "2026-09-30T23:59:59.000Z",
  createdById: "user-president-243",
  createdAt: "2026-07-01T12:00:00.000Z",
  updatedAt: "2026-07-01T12:00:00.000Z",
};

const jhsc: Circle = {
  id: "circle-jhsc-243",
  unionId: UNION,
  localId: LOCAL,
  kind: "committee",
  name: "JHSC",
  description: "Joint Health & Safety Committee.",
  visibility: "invited",
  frontStartsAt: "2026-06-01T00:00:00.000Z",
  frontEndsAt: "2026-12-31T23:59:59.000Z",
  createdById: "user-president-243",
  createdAt: "2026-07-02T12:00:00.000Z",
  updatedAt: "2026-07-02T12:00:00.000Z",
};

const circles: Circle[] = [hall, lec, jhsc];

const memberships: CircleMembership[] = [
  {
    id: "cm-1",
    circleId: hall.id,
    userId: "user-president-243",
    userName: "Local 243 President",
    role: "admin",
    muted: false,
    mutedTools: [],
    starred: true,
    joinedAt: hall.createdAt,
  },
  {
    id: "cm-2",
    circleId: hall.id,
    userId: "user-steward-243",
    userName: "Local 243 Steward (FT)",
    role: "member",
    muted: false,
    mutedTools: [],
    starred: true,
    joinedAt: hall.createdAt,
  },
  {
    id: "cm-3",
    circleId: hall.id,
    userId: "user-member-243",
    userName: "Local 243 Member",
    role: "member",
    muted: false,
    mutedTools: [],
    starred: false,
    joinedAt: hall.createdAt,
  },
  {
    id: "cm-4",
    circleId: lec.id,
    userId: "user-president-243",
    userName: "Local 243 President",
    role: "admin",
    muted: false,
    mutedTools: [],
    starred: true,
    joinedAt: lec.createdAt,
  },
  {
    id: "cm-5",
    circleId: lec.id,
    userId: "user-steward-243",
    userName: "Local 243 Steward (FT)",
    role: "member",
    muted: false,
    mutedTools: [],
    starred: false,
    joinedAt: lec.createdAt,
  },
  {
    id: "cm-6",
    circleId: jhsc.id,
    userId: "user-steward-243",
    userName: "Local 243 Steward (FT)",
    role: "admin",
    muted: false,
    mutedTools: [],
    starred: true,
    joinedAt: jhsc.createdAt,
  },
  {
    id: "cm-7",
    circleId: jhsc.id,
    userId: "user-member-243",
    userName: "Local 243 Member",
    role: "member",
    muted: false,
    mutedTools: [],
    starred: false,
    joinedAt: jhsc.createdAt,
  },
  {
    id: "cm-8",
    circleId: hall.id,
    userId: "user-stability-243",
    userName: "Stability Committee Rep",
    role: "member",
    muted: false,
    mutedTools: [],
    starred: false,
    joinedAt: hall.createdAt,
  },
];

const bulletin: BulletinPost[] = [
  {
    id: "bp-1",
    circleId: hall.id,
    unionId: UNION,
    authorId: "user-president-243",
    authorName: "Local 243 President",
    title: "Welcome to the Hall",
    body: "Bulletin is for decisions on the record. Actions are follow-ups. The next membership meeting is on the Calendar — grab an Action if you can help with the door stack.",
    pinned: true,
    createdAt: daysFromNow(-3, 14),
    updatedAt: daysFromNow(-3, 14),
  },
  {
    id: "bp-2",
    circleId: lec.id,
    unionId: UNION,
    authorId: "user-president-243",
    authorName: "Local 243 President",
    title: "LEC agenda items for Thursday",
    body: "Bring notes on steward coverage and the membership meeting flyer.",
    pinned: false,
    createdAt: daysFromNow(-1, 9),
    updatedAt: daysFromNow(-1, 9),
  },
  {
    id: "bp-3",
    circleId: hall.id,
    unionId: UNION,
    authorId: "user-member-243",
    authorName: "Local 243 Member",
    title: "Door stack is at the steward office",
    body: "Printed this morning. I can hang copies after lunch if someone has the board keys.",
    pinned: false,
    createdAt: daysFromNow(-1, 15),
    updatedAt: daysFromNow(-1, 15),
  },
  {
    id: "bp-4",
    circleId: jhsc.id,
    unionId: UNION,
    authorId: "user-steward-243",
    authorName: "Local 243 Steward (FT)",
    title: "Inspection walk Friday",
    body: "Meet at the north lot at 8:30. Lighting and the library ergonomics request are on Many hands.",
    pinned: false,
    createdAt: daysFromNow(-2, 11),
    updatedAt: daysFromNow(-2, 11),
  },
];

const comments: BulletinComment[] = [
  {
    id: "bc-1",
    postId: "bp-2",
    authorId: "user-steward-243",
    authorName: "Local 243 Steward (FT)",
    body: "I'll draft the coverage grid.",
    createdAt: daysFromNow(-1, 10),
  },
];

const nextWeek = new Date();
nextWeek.setDate(nextWeek.getDate() + 7);
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const actions: ActionItem[] = [
  {
    id: "act-1",
    circleId: lec.id,
    unionId: UNION,
    listName: "Follow-ups",
    title: "Draft steward coverage grid",
    assigneeId: "user-steward-243",
    assigneeName: "Local 243 Steward (FT)",
    dueAt: yesterday.toISOString(),
    createdById: "user-president-243",
    createdAt: daysFromNow(-2, 9),
    updatedAt: daysFromNow(-2, 9),
  },
  {
    id: "act-2",
    circleId: hall.id,
    unionId: UNION,
    listName: "Comms",
    title: "Post membership meeting notice",
    assigneeId: "user-member-243",
    assigneeName: "Local 243 Member",
    dueAt: nextWeek.toISOString(),
    createdById: "user-president-243",
    createdAt: daysFromNow(-2, 12),
    updatedAt: daysFromNow(-2, 12),
  },
  {
    id: "act-3",
    circleId: hall.id,
    unionId: UNION,
    listName: "Comms",
    title: "Print the door stack",
    assigneeId: "user-member-243",
    assigneeName: "Local 243 Member",
    dueAt: daysFromNow(-1, 12),
    completedAt: daysFromNow(-1, 14),
    createdById: "user-president-243",
    createdAt: daysFromNow(-3, 12),
    updatedAt: daysFromNow(-1, 14),
  },
];

const calendar: CalendarEvent[] = [
  {
    id: "cal-1",
    circleId: hall.id,
    unionId: UNION,
    title: "Membership meeting",
    description: "Hybrid — Hall + Teams",
    startsAt: nextWeek.toISOString(),
    location: "Main campus room A",
    createdById: "user-president-243",
    createdAt: daysFromNow(-4, 12),
  },
  {
    id: "cal-2",
    circleId: hall.id,
    unionId: UNION,
    title: "Steward drop-in",
    description: "Questions at the board — no appointment needed.",
    startsAt: daysFromNow(2, 12),
    location: "Steward office",
    createdById: "user-steward-243",
    createdAt: daysFromNow(-2, 10),
  },
];

const binder: BinderItem[] = [
  {
    id: "bind-1",
    circleId: hall.id,
    unionId: UNION,
    title: "How we use Circles",
    folder: "Onboarding",
    content:
      "Hall = whole local. Committees = invited Circles. Confidential casework stays in Officer Hub.",
    contentType: "note",
    createdById: "user-president-243",
    createdByName: "Local 243 President",
    createdAt: daysFromNow(-5, 14),
  },
  {
    id: "bind-2",
    circleId: hall.id,
    unionId: UNION,
    title: "Board posting checklist",
    folder: "Onboarding",
    content:
      "Print, date, and pin. Take down last month’s notice. QR on the flyer points to the Calendar event.",
    contentType: "note",
    createdById: "user-steward-243",
    createdByName: "Local 243 Steward (FT)",
    createdAt: daysFromNow(-2, 13),
  },
];

const floor: FloorMessage[] = [
  {
    id: "fl-1",
    circleId: jhsc.id,
    unionId: UNION,
    authorId: "user-steward-243",
    authorName: "Local 243 Steward (FT)",
    body: "Inspection walk scheduled for Friday morning.",
    createdAt: daysFromNow(-1, 8),
  },
  {
    id: "fl-2",
    circleId: hall.id,
    unionId: UNION,
    authorId: "user-member-243",
    authorName: "Local 243 Member",
    body: "Door stack is printed — I'll hang it after lunch if the board keys are free.",
    createdAt: daysFromNow(-1, 16),
  },
  {
    id: "fl-3",
    circleId: hall.id,
    unionId: UNION,
    authorId: "user-steward-243",
    authorName: "Local 243 Steward (FT)",
    body: "Keys are in the steward office. Hang the new notice under last month's.",
    createdAt: daysFromNow(0, 10),
  },
];

const rollQuestions: RollCallQuestion[] = [
  {
    id: "rcq-1",
    circleId: lec.id,
    unionId: UNION,
    question: "Any campus issues that need LEC eyes this week?",
    cadence: "weekly",
    active: true,
    createdAt: daysFromNow(-20, 12),
  },
];

const rollAnswers: RollCallAnswer[] = [
  {
    id: "rca-1",
    questionId: "rcq-1",
    circleId: lec.id,
    authorId: "user-steward-243",
    authorName: "Local 243 Steward (FT)",
    body: "Parking enforcement complaints on north lot — watching.",
    createdAt: daysFromNow(-1, 11),
  },
];

const pipelineBoard: PipelineBoard = {
  id: "pipe-1",
  circleId: jhsc.id,
  unionId: UNION,
  name: "Inspection many hands",
};

const pipelineColumns: PipelineColumn[] = [
  { id: "col-1", boardId: "pipe-1", name: "Backlog", position: 0 },
  { id: "col-2", boardId: "pipe-1", name: "In progress", position: 1 },
  { id: "col-3", boardId: "pipe-1", name: "Done", position: 2 },
];

const pipelineCards: PipelineCard[] = [
  {
    id: "pc-1",
    boardId: "pipe-1",
    columnId: "col-1",
    title: "North lot lighting",
    position: 0,
    createdAt: "2026-07-15T12:00:00.000Z",
  },
  {
    id: "pc-2",
    boardId: "pipe-1",
    columnId: "col-2",
    title: "Ergonomics request — library",
    position: 0,
    createdAt: "2026-07-16T12:00:00.000Z",
  },
];

const boards: PipelineBoard[] = [pipelineBoard];

const dispatch: DispatchItem[] = [
  {
    id: "di-1",
    unionId: UNION,
    userId: "user-steward-243",
    circleId: lec.id,
    circleName: "LEC",
    kind: "assignment",
    title: "Action assigned: Draft steward coverage grid",
    createdAt: daysFromNow(-2, 9),
  },
  {
    id: "di-2",
    unionId: UNION,
    userId: "user-member-243",
    circleId: hall.id,
    circleName: "Local 243 Hall",
    kind: "assignment",
    title: "Action assigned: Post membership meeting notice",
    createdAt: daysFromNow(-2, 12),
  },
  {
    id: "di-3",
    unionId: UNION,
    userId: "user-steward-243",
    circleId: lec.id,
    circleName: "LEC",
    kind: "due_soon",
    title: "Overdue Action: Draft steward coverage grid",
    createdAt: yesterday.toISOString(),
  },
];

const momentum: MomentumItem[] = [
  {
    id: "mom-1",
    circleId: lec.id,
    unionId: UNION,
    title: "Membership meeting turnout plan",
    notes: "One fight is moving — locking speakers and food.",
    progress: 72,
    updatedById: "user-president-243",
    updatedByName: "Local 243 President",
    createdAt: "2026-07-10T12:00:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z",
  },
  {
    id: "mom-2",
    circleId: jhsc.id,
    unionId: UNION,
    title: "North lot lighting remediation",
    notes: "Still stuck — employer quote pending.",
    progress: 35,
    updatedById: "user-steward-243",
    updatedByName: "Local 243 Steward (FT)",
    createdAt: "2026-07-12T12:00:00.000Z",
    updatedAt: "2026-07-19T12:00:00.000Z",
  },
];

const sidebarThreads: SidebarThread[] = [
  {
    id: "sb-1",
    unionId: UNION,
    participantIds: ["user-president-243", "user-steward-243"],
    participantNames: ["Local 243 President", "Local 243 Steward (FT)"],
    updatedAt: "2026-07-20T16:00:00.000Z",
  },
];

const sidebarMessages: SidebarMessage[] = [
  {
    id: "sbm-1",
    threadId: "sb-1",
    unionId: UNION,
    authorId: "user-president-243",
    authorName: "Local 243 President",
    body: "Can you cover the Hall notice before Thursday?",
    createdAt: "2026-07-20T15:55:00.000Z",
  },
  {
    id: "sbm-2",
    threadId: "sb-1",
    unionId: UNION,
    authorId: "user-steward-243",
    authorName: "Local 243 Steward (FT)",
    body: "Yes — I'll post to Bulletin tonight.",
    createdAt: "2026-07-20T16:00:00.000Z",
  },
];

function membershipFor(userId: string, circleId: string) {
  return memberships.find(
    (m) => m.userId === userId && m.circleId === circleId,
  );
}

const auditLog: PortalAuditEntry[] = [];

function pushDispatch(
  item: Omit<DispatchItem, "id" | "createdAt"> & { createdAt?: string },
) {
  dispatch.unshift({
    ...item,
    id: id("di"),
    createdAt: item.createdAt ?? now(),
  });
}

function pushAudit(
  entry: Omit<PortalAuditEntry, "id" | "createdAt"> & { createdAt?: string },
) {
  auditLog.unshift({
    ...entry,
    id: id("pa"),
    createdAt: entry.createdAt ?? now(),
  });
}

function dispatchKindToTool(kind: DispatchItem["kind"]): PortalToolMute | null {
  switch (kind) {
    case "bulletin":
    case "mention":
      return "bulletin";
    case "assignment":
    case "due_soon":
      return "actions";
    case "roll_call":
      return "rollCall";
    case "pipeline":
      return "pipeline";
    default:
      return null;
  }
}

function isDispatchMuted(
  userId: string,
  circleId: string,
  kind: DispatchItem["kind"],
): boolean {
  const m = membershipFor(userId, circleId);
  if (!m) return true;
  if (m.muted) return true;
  const tool = dispatchKindToTool(kind);
  return Boolean(tool && m.mutedTools.includes(tool));
}

function notifyMentions(input: {
  text: string;
  circleId: string;
  unionId: string;
  authorId: string;
  title: string;
}) {
  const roster = memberships.filter((m) => m.circleId === input.circleId);
  const mentioned = resolveMentions(input.text, roster, input.authorId);
  const circle = circles.find((c) => c.id === input.circleId);
  for (const person of mentioned) {
    if (isDispatchMuted(person.userId, input.circleId, "mention")) continue;
    pushDispatch({
      unionId: input.unionId,
      userId: person.userId,
      circleId: input.circleId,
      circleName: circle?.name ?? "Circle",
      kind: "mention",
      title: input.title,
      body: `@${person.userName}`,
    });
  }
}

export class MemoryPortalAdapter {
  listStation(unionId: string, userId: string): StationPayload {
    const mine = memberships.filter((m) => m.userId === userId);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekIso = weekAgo.toISOString();

    const circleList = circles
      .filter(
        (c) =>
          c.unionId === unionId &&
          !c.archivedAt &&
          mine.some((m) => m.circleId === c.id),
      )
      .map((c) => {
        const membership = membershipFor(userId, c.id)!;
        const overdueActions = actions.filter(
          (a) =>
            a.circleId === c.id &&
            !a.completedAt &&
            !a.deletedAt &&
            a.dueAt &&
            a.dueAt < now() &&
            (a.assigneeId === userId || membership.role === "admin"),
        ).length;
        const circleDispatchUnread = dispatch.filter(
          (d) =>
            d.userId === userId &&
            d.circleId === c.id &&
            !d.readAt &&
            !isDispatchMuted(userId, c.id, d.kind),
        ).length;
        return {
          ...c,
          membership,
          overdueActions,
          dispatchUnread: circleDispatchUnread,
        };
      })
      .sort((a, b) => Number(b.membership.starred) - Number(a.membership.starred));

    const circleIds = new Set(mine.map((m) => m.circleId));

    const myActions = actions
      .filter(
        (a) =>
          a.unionId === unionId &&
          a.assigneeId === userId &&
          !a.completedAt &&
          !a.deletedAt &&
          circleIds.has(a.circleId),
      )
      .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));

    const recentBulletin = bulletin
      .filter(
        (p) =>
          p.unionId === unionId &&
          circleIds.has(p.circleId) &&
          !p.deletedAt,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);

    const dispatchUnread = dispatch.filter(
      (d) =>
        d.userId === userId &&
        d.unionId === unionId &&
        !d.readAt &&
        !isDispatchMuted(userId, d.circleId, d.kind),
    ).length;

    const upcomingEvents = calendar
      .filter(
        (ev) =>
          ev.unionId === unionId &&
          circleIds.has(ev.circleId) &&
          ev.startsAt >= now(),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 4)
      .map((ev) => ({
        ...ev,
        circleName: circles.find((c) => c.id === ev.circleId)?.name ?? ev.circleId,
      }));

    const weekDigest = {
      bulletinPosts: bulletin.filter(
        (p) =>
          circleIds.has(p.circleId) &&
          !p.deletedAt &&
          p.createdAt >= weekIso,
      ).length,
      actionsCompleted: actions.filter(
        (a) =>
          circleIds.has(a.circleId) &&
          a.completedAt &&
          !a.deletedAt &&
          a.completedAt >= weekIso,
      ).length,
      floorMessages: floor.filter(
        (m) => circleIds.has(m.circleId) && m.createdAt >= weekIso,
      ).length,
    };

    return {
      circles: circleList,
      myActions,
      recentBulletin,
      dispatchUnread,
      upcomingEvents,
      weekDigest,
    };
  }

  getCircleDetail(
    unionId: string,
    userId: string,
    circleId: string,
  ): CircleDetailPayload | null {
    const circle = circles.find(
      (c) => c.id === circleId && c.unionId === unionId,
    );
    if (!circle) return null;
    const membership = membershipFor(userId, circleId);
    if (!membership) return null;

    const board = boards.find((b) => b.circleId === circleId) ?? null;

    return {
      circle,
      membership,
      roster: memberships.filter((m) => m.circleId === circleId),
      bulletin: bulletin
        .filter((p) => p.circleId === circleId && !p.deletedAt)
        .sort(
          (a, b) =>
            Number(b.pinned) - Number(a.pinned) ||
            b.createdAt.localeCompare(a.createdAt),
        ),
      comments: comments.filter((c) =>
        bulletin.some(
          (p) => p.id === c.postId && p.circleId === circleId && !p.deletedAt,
        ),
      ),
      actions: actions
        .filter((a) => a.circleId === circleId && !a.deletedAt)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      calendar: calendar
        .filter((e) => e.circleId === circleId)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      binder: binder
        .filter((b) => b.circleId === circleId && !b.deletedAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      floor: floor
        .filter((m) => m.circleId === circleId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      rollCallQuestions: rollQuestions.filter((q) => q.circleId === circleId),
      rollCallAnswers: rollAnswers.filter((a) => a.circleId === circleId),
      pipelineBoard: board,
      pipelineColumns: board
        ? pipelineColumns
            .filter((c) => c.boardId === board.id)
            .sort((a, b) => a.position - b.position)
        : [],
      pipelineCards: board
        ? pipelineCards.filter((c) => c.boardId === board.id)
        : [],
      momentum: momentum
        .filter((m) => m.circleId === circleId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    };
  }

  createCircle(input: {
    unionId: string;
    localId?: string;
    kind: Circle["kind"];
    name: string;
    description?: string;
    visibility: Circle["visibility"];
    createdById: string;
    createdByName: string;
    /** Preset: seed Many hands + Roll Call like JHSC/LEC templates */
    template?: "blank" | "lec" | "jhsc" | "campaign";
    frontStartsAt?: string;
    frontEndsAt?: string;
  }): Circle {
    const circle: Circle = {
      id: id("circle"),
      unionId: input.unionId,
      localId: input.localId,
      kind: input.kind,
      name: input.name,
      description: input.description,
      visibility: input.visibility,
      frontStartsAt: input.frontStartsAt,
      frontEndsAt: input.frontEndsAt,
      createdById: input.createdById,
      createdAt: now(),
      updatedAt: now(),
    };
    circles.push(circle);
    memberships.push({
      id: id("cm"),
      circleId: circle.id,
      userId: input.createdById,
      userName: input.createdByName,
      role: "admin",
      muted: false,
      mutedTools: [],
      starred: true,
      joinedAt: circle.createdAt,
    });

    const tpl = input.template ?? "blank";
    if (tpl === "jhsc" || tpl === "lec" || tpl === "campaign") {
      const board: PipelineBoard = {
        id: id("pipe"),
        circleId: circle.id,
        unionId: input.unionId,
        name:
          tpl === "jhsc"
            ? "Inspection many hands"
            : tpl === "lec"
              ? "LEC follow-ups"
              : "Campaign many hands",
      };
      boards.push(board);
      const cols = ["Backlog", "In progress", "Done"];
      cols.forEach((name, position) => {
        pipelineColumns.push({
          id: id("col"),
          boardId: board.id,
          name,
          position,
        });
      });
      rollQuestions.push({
        id: id("rcq"),
        circleId: circle.id,
        unionId: input.unionId,
        question:
          tpl === "jhsc"
            ? "Any health & safety issues this week?"
            : tpl === "lec"
              ? "Any campus issues that need LEC eyes this week?"
              : "What moved the campaign forward this week?",
        cadence: "weekly",
        active: true,
        createdAt: now(),
      });
    }
    return circle;
  }

  updateMembership(
    userId: string,
    circleId: string,
    patch: Partial<
      Pick<CircleMembership, "muted" | "starred" | "role" | "mutedTools">
    >,
  ): CircleMembership | null {
    const m = membershipFor(userId, circleId);
    if (!m) return null;
    if (patch.muted !== undefined) m.muted = patch.muted;
    if (patch.starred !== undefined) m.starred = patch.starred;
    if (patch.role !== undefined) m.role = patch.role;
    if (patch.mutedTools !== undefined) m.mutedTools = patch.mutedTools;
    if (!m.mutedTools) m.mutedTools = [];
    return m;
  }

  archiveCircle(circleId: string, unionId: string): boolean {
    const c = circles.find((x) => x.id === circleId && x.unionId === unionId);
    if (!c) return false;
    c.archivedAt = now();
    c.updatedAt = now();
    pushAudit({
      unionId,
      circleId,
      userId: c.createdById,
      action: "circle.archive",
      resourceType: "circle",
      resourceId: circleId,
    });
    return true;
  }

  addBulletin(input: {
    circleId: string;
    unionId: string;
    authorId: string;
    authorName: string;
    title: string;
    body: string;
  }): BulletinPost {
    const post: BulletinPost = {
      id: id("bp"),
      ...input,
      pinned: false,
      createdAt: now(),
      updatedAt: now(),
    };
    bulletin.unshift(post);
    for (const m of memberships.filter(
      (x) => x.circleId === input.circleId && x.userId !== input.authorId,
    )) {
      if (isDispatchMuted(m.userId, input.circleId, "bulletin")) continue;
      const circle = circles.find((c) => c.id === input.circleId);
      pushDispatch({
        unionId: input.unionId,
        userId: m.userId,
        circleId: input.circleId,
        circleName: circle?.name ?? "Circle",
        kind: "bulletin",
        title: `Bulletin: ${input.title}`,
      });
    }
    notifyMentions({
      text: `${input.title}\n${input.body}`,
      circleId: input.circleId,
      unionId: input.unionId,
      authorId: input.authorId,
      title: `Mentioned in Bulletin: ${input.title}`,
    });
    pushAudit({
      unionId: input.unionId,
      circleId: input.circleId,
      userId: input.authorId,
      action: "bulletin.create",
      resourceType: "bulletin",
      resourceId: post.id,
    });
    return post;
  }

  addComment(input: {
    postId: string;
    authorId: string;
    authorName: string;
    body: string;
  }): BulletinComment {
    const post = bulletin.find((p) => p.id === input.postId && !p.deletedAt);
    const comment: BulletinComment = {
      id: id("bc"),
      ...input,
      createdAt: now(),
    };
    comments.push(comment);
    if (post) {
      notifyMentions({
        text: input.body,
        circleId: post.circleId,
        unionId: post.unionId,
        authorId: input.authorId,
        title: `Mentioned in comment: ${post.title}`,
      });
    }
    return comment;
  }

  addAction(input: {
    circleId: string;
    unionId: string;
    listName: string;
    title: string;
    notes?: string;
    assigneeId?: string;
    assigneeName?: string;
    dueAt?: string;
    createdById: string;
    sourceBulletinPostId?: string;
  }): ActionItem {
    const item: ActionItem = {
      id: id("act"),
      ...input,
      createdAt: now(),
      updatedAt: now(),
    };
    actions.unshift(item);
    if (input.assigneeId && input.assigneeId !== input.createdById) {
      const circle = circles.find((c) => c.id === input.circleId);
      pushDispatch({
        unionId: input.unionId,
        userId: input.assigneeId,
        circleId: input.circleId,
        circleName: circle?.name ?? "Circle",
        kind: "assignment",
        title: `Action assigned: ${input.title}`,
      });
    }
    return item;
  }

  completeAction(actionId: string, unionId: string): ActionItem | null {
    const a = actions.find((x) => x.id === actionId && x.unionId === unionId);
    if (!a) return null;
    a.completedAt = now();
    a.updatedAt = now();
    return a;
  }

  addCalendarEvent(input: {
    circleId: string;
    unionId: string;
    title: string;
    description?: string;
    startsAt: string;
    endsAt?: string;
    location?: string;
    externalUrl?: string;
    createdById: string;
  }): CalendarEvent {
    const event: CalendarEvent = {
      id: id("cal"),
      ...input,
      createdAt: now(),
    };
    calendar.push(event);
    return event;
  }

  addBinderItem(input: {
    circleId: string;
    unionId: string;
    title: string;
    folder?: string;
    content: string;
    contentType: BinderItem["contentType"];
    createdById: string;
    createdByName: string;
  }): BinderItem {
    const item: BinderItem = {
      id: id("bind"),
      ...input,
      createdAt: now(),
    };
    binder.unshift(item);
    return item;
  }

  addFloorMessage(input: {
    circleId: string;
    unionId: string;
    authorId: string;
    authorName: string;
    body: string;
  }): FloorMessage {
    const msg: FloorMessage = {
      id: id("fl"),
      ...input,
      createdAt: now(),
    };
    floor.push(msg);
    notifyMentions({
      text: input.body,
      circleId: input.circleId,
      unionId: input.unionId,
      authorId: input.authorId,
      title: "Mentioned on the Floor",
    });
    return msg;
  }

  addRollCallAnswer(input: {
    questionId: string;
    circleId: string;
    authorId: string;
    authorName: string;
    body: string;
  }): RollCallAnswer {
    const answer: RollCallAnswer = {
      id: id("rca"),
      ...input,
      createdAt: now(),
    };
    rollAnswers.push(answer);
    return answer;
  }

  movePipelineCard(
    cardId: string,
    columnId: string,
    unionId: string,
  ): PipelineCard | null {
    const card = pipelineCards.find((c) => c.id === cardId);
    if (!card) return null;
    const board = boards.find(
      (b) => b.id === card.boardId && b.unionId === unionId,
    );
    if (!board) return null;
    card.columnId = columnId;
    return card;
  }

  addPipelineCard(input: {
    boardId: string;
    columnId: string;
    title: string;
    body?: string;
  }): PipelineCard | null {
    const board = boards.find((b) => b.id === input.boardId);
    if (!board) return null;
    const card: PipelineCard = {
      id: id("pc"),
      boardId: input.boardId,
      columnId: input.columnId,
      title: input.title,
      body: input.body,
      position: pipelineCards.filter((c) => c.columnId === input.columnId)
        .length,
      createdAt: now(),
    };
    pipelineCards.push(card);
    return card;
  }

  listDispatch(unionId: string, userId: string): DispatchItem[] {
    return dispatch
      .filter((d) => d.unionId === unionId && d.userId === userId)
      .filter((d) => !isDispatchMuted(userId, d.circleId, d.kind))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  markDispatchRead(unionId: string, userId: string, ids?: string[]): number {
    let n = 0;
    for (const d of dispatch) {
      if (d.unionId !== unionId || d.userId !== userId || d.readAt) continue;
      if (ids && !ids.includes(d.id)) continue;
      d.readAt = now();
      n += 1;
    }
    return n;
  }

  oversight(circleId: string, unionId: string) {
    const open = actions.filter(
      (a) =>
        a.circleId === circleId &&
        a.unionId === unionId &&
        !a.completedAt &&
        !a.deletedAt,
    );
    return {
      overdue: open.filter((a) => a.dueAt && a.dueAt < now()),
      unassigned: open.filter((a) => !a.assigneeId),
      doneToday: actions.filter(
        (a) =>
          a.circleId === circleId &&
          !a.deletedAt &&
          a.completedAt &&
          a.completedAt.slice(0, 10) === now().slice(0, 10),
      ),
      openCount: open.length,
    };
  }

  softDelete(
    resourceType: "bulletin" | "action" | "binder",
    resourceId: string,
    unionId: string,
    userId: string,
  ): boolean {
    if (resourceType === "bulletin") {
      const post = bulletin.find(
        (p) => p.id === resourceId && p.unionId === unionId && !p.deletedAt,
      );
      if (!post) return false;
      post.deletedAt = now();
      post.updatedAt = now();
      pushAudit({
        unionId,
        circleId: post.circleId,
        userId,
        action: "bulletin.soft_delete",
        resourceType: "bulletin",
        resourceId,
      });
      return true;
    }
    if (resourceType === "action") {
      const a = actions.find(
        (x) => x.id === resourceId && x.unionId === unionId && !x.deletedAt,
      );
      if (!a) return false;
      a.deletedAt = now();
      a.updatedAt = now();
      pushAudit({
        unionId,
        circleId: a.circleId,
        userId,
        action: "action.soft_delete",
        resourceType: "action",
        resourceId,
      });
      return true;
    }
    const item = binder.find(
      (b) => b.id === resourceId && b.unionId === unionId && !b.deletedAt,
    );
    if (!item) return false;
    item.deletedAt = now();
    pushAudit({
      unionId,
      circleId: item.circleId,
      userId,
      action: "binder.soft_delete",
      resourceType: "binder",
      resourceId,
    });
    return true;
  }

  listAudit(circleId: string, unionId: string, limit = 40): PortalAuditEntry[] {
    return auditLog
      .filter((e) => e.circleId === circleId && e.unionId === unionId)
      .slice(0, limit);
  }

  exportActivityPack(circleId: string, unionId: string) {
    const circle = circles.find((c) => c.id === circleId && c.unionId === unionId);
    if (!circle) return null;
    return {
      exportedAt: now(),
      circle,
      roster: memberships.filter((m) => m.circleId === circleId),
      bulletin: bulletin.filter((p) => p.circleId === circleId && !p.deletedAt),
      comments: comments.filter((c) =>
        bulletin.some((p) => p.id === c.postId && p.circleId === circleId),
      ),
      actions: actions.filter((a) => a.circleId === circleId && !a.deletedAt),
      calendar: calendar.filter((e) => e.circleId === circleId),
      binder: binder.filter((b) => b.circleId === circleId && !b.deletedAt),
      floor: floor.filter((m) => m.circleId === circleId),
      momentum: momentum.filter((m) => m.circleId === circleId),
      audit: this.listAudit(circleId, unionId, 100),
    };
  }

  importBasecampRows(
    circleId: string,
    unionId: string,
    authorId: string,
    authorName: string,
    rows: BasecampImportRow[],
  ): { created: number } {
    let created = 0;
    for (const row of rows) {
      if (row.kind === "bulletin") {
        this.addBulletin({
          circleId,
          unionId,
          authorId,
          authorName,
          title: row.title,
          body: row.body || "(imported)",
        });
        created += 1;
      } else if (row.kind === "action") {
        this.addAction({
          circleId,
          unionId,
          listName: "Imported",
          title: row.title,
          notes: row.body || undefined,
          createdById: authorId,
        });
        created += 1;
      } else {
        this.addBinderItem({
          circleId,
          unionId,
          title: row.title,
          content: row.body || "(imported)",
          contentType: "note",
          createdById: authorId,
          createdByName: authorName,
        });
        created += 1;
      }
    }
    pushAudit({
      unionId,
      circleId,
      userId: authorId,
      action: "circle.basecamp_import",
      resourceType: "circle",
      resourceId: circleId,
      metadata: { count: String(created) },
    });
    return { created };
  }

  importBasecampCsv(
    circleId: string,
    unionId: string,
    authorId: string,
    authorName: string,
    csv: string,
  ): { created: number; rows: number } {
    const rows = parseBasecampCsv(csv);
    const result = this.importBasecampRows(
      circleId,
      unionId,
      authorId,
      authorName,
      rows,
    );
    return { created: result.created, rows: rows.length };
  }

  pinBulletin(postId: string, unionId: string, pinned: boolean): BulletinPost | null {
    const post = bulletin.find((p) => p.id === postId && p.unionId === unionId);
    if (!post) return null;
    post.pinned = pinned;
    post.updatedAt = now();
    return post;
  }

  upsertMomentum(input: {
    id?: string;
    circleId: string;
    unionId: string;
    title: string;
    notes?: string;
    progress: number;
    updatedById: string;
    updatedByName: string;
  }): MomentumItem {
    const progress = Math.max(0, Math.min(100, Math.round(input.progress)));
    if (input.id) {
      const existing = momentum.find(
        (m) => m.id === input.id && m.unionId === input.unionId,
      );
      if (existing) {
        existing.title = input.title;
        existing.notes = input.notes;
        existing.progress = progress;
        existing.updatedById = input.updatedById;
        existing.updatedByName = input.updatedByName;
        existing.updatedAt = now();
        return existing;
      }
    }
    const item: MomentumItem = {
      id: id("mom"),
      circleId: input.circleId,
      unionId: input.unionId,
      title: input.title,
      notes: input.notes,
      progress,
      updatedById: input.updatedById,
      updatedByName: input.updatedByName,
      createdAt: now(),
      updatedAt: now(),
    };
    momentum.unshift(item);
    return item;
  }

  inviteToRoster(input: {
    circleId: string;
    userId: string;
    userName: string;
    role?: CircleMembership["role"];
  }): CircleMembership | null {
    if (membershipFor(input.userId, input.circleId)) {
      return membershipFor(input.userId, input.circleId)!;
    }
    if (!circles.some((c) => c.id === input.circleId)) return null;
    const m: CircleMembership = {
      id: id("cm"),
      circleId: input.circleId,
      userId: input.userId,
      userName: input.userName,
      role: input.role ?? "member",
      muted: false,
      mutedTools: [],
      starred: false,
      joinedAt: now(),
    };
    memberships.push(m);
    return m;
  }

  addRollCallQuestion(input: {
    circleId: string;
    unionId: string;
    question: string;
    cadence?: RollCallQuestion["cadence"];
  }): RollCallQuestion {
    const q: RollCallQuestion = {
      id: id("rcq"),
      circleId: input.circleId,
      unionId: input.unionId,
      question: input.question,
      cadence: input.cadence ?? "weekly",
      active: true,
      createdAt: now(),
    };
    rollQuestions.push(q);
    return q;
  }

  listFronts(unionId: string, userId: string): Circle[] {
    const mine = new Set(
      memberships.filter((m) => m.userId === userId).map((m) => m.circleId),
    );
    return circles
      .filter(
        (c) =>
          c.unionId === unionId &&
          !c.archivedAt &&
          mine.has(c.id) &&
          (c.frontStartsAt || c.frontEndsAt),
      )
      .sort((a, b) =>
        (a.frontStartsAt ?? a.createdAt).localeCompare(
          b.frontStartsAt ?? b.createdAt,
        ),
      );
  }

  setFrontDates(
    circleId: string,
    unionId: string,
    frontStartsAt?: string,
    frontEndsAt?: string,
  ): Circle | null {
    const c = circles.find((x) => x.id === circleId && x.unionId === unionId);
    if (!c) return null;
    c.frontStartsAt = frontStartsAt;
    c.frontEndsAt = frontEndsAt;
    c.updatedAt = now();
    return c;
  }

  listSidebarThreads(unionId: string, userId: string): SidebarThread[] {
    return sidebarThreads
      .filter(
        (t) => t.unionId === unionId && t.participantIds.includes(userId),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getSidebarMessages(
    unionId: string,
    userId: string,
    threadId: string,
  ): SidebarMessage[] | null {
    const thread = sidebarThreads.find(
      (t) => t.id === threadId && t.unionId === unionId,
    );
    if (!thread || !thread.participantIds.includes(userId)) return null;
    return sidebarMessages
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  ensureSidebarThread(input: {
    unionId: string;
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
  }): SidebarThread {
    const existing = sidebarThreads.find(
      (t) =>
        t.unionId === input.unionId &&
        t.participantIds.includes(input.fromId) &&
        t.participantIds.includes(input.toId),
    );
    if (existing) return existing;
    const thread: SidebarThread = {
      id: id("sb"),
      unionId: input.unionId,
      participantIds: [input.fromId, input.toId],
      participantNames: [input.fromName, input.toName],
      updatedAt: now(),
    };
    sidebarThreads.push(thread);
    return thread;
  }

  sendSidebarMessage(input: {
    unionId: string;
    threadId: string;
    authorId: string;
    authorName: string;
    body: string;
  }): SidebarMessage | null {
    const thread = sidebarThreads.find(
      (t) => t.id === input.threadId && t.unionId === input.unionId,
    );
    if (!thread || !thread.participantIds.includes(input.authorId)) return null;
    const msg: SidebarMessage = {
      id: id("sbm"),
      threadId: input.threadId,
      unionId: input.unionId,
      authorId: input.authorId,
      authorName: input.authorName,
      body: input.body,
      createdAt: now(),
    };
    sidebarMessages.push(msg);
    thread.updatedAt = now();
    return msg;
  }

  search(
    unionId: string,
    userId: string,
    query: string,
  ): PortalSearchHit[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const mine = new Set(
      memberships.filter((m) => m.userId === userId).map((m) => m.circleId),
    );
    const nameOf = (circleId: string) =>
      circles.find((c) => c.id === circleId)?.name ?? "Circle";
    const hits: PortalSearchHit[] = [];

    for (const c of circles) {
      if (c.unionId !== unionId || !mine.has(c.id) || c.archivedAt) continue;
      if (c.name.toLowerCase().includes(q)) {
        hits.push({
          kind: "circle",
          id: c.id,
          circleId: c.id,
          circleName: c.name,
          title: c.name,
          snippet: c.description ?? c.kind,
        });
      }
    }
    for (const p of bulletin) {
      if (p.unionId !== unionId || !mine.has(p.circleId) || p.deletedAt) continue;
      if (
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q)
      ) {
        hits.push({
          kind: "bulletin",
          id: p.id,
          circleId: p.circleId,
          circleName: nameOf(p.circleId),
          title: p.title,
          snippet: p.body.slice(0, 120),
        });
      }
    }
    for (const a of actions) {
      if (a.unionId !== unionId || !mine.has(a.circleId) || a.deletedAt) continue;
      if (a.title.toLowerCase().includes(q)) {
        hits.push({
          kind: "action",
          id: a.id,
          circleId: a.circleId,
          circleName: nameOf(a.circleId),
          title: a.title,
          snippet: a.listName,
        });
      }
    }
    for (const b of binder) {
      if (b.unionId !== unionId || !mine.has(b.circleId) || b.deletedAt) continue;
      if (
        b.title.toLowerCase().includes(q) ||
        b.content.toLowerCase().includes(q)
      ) {
        hits.push({
          kind: "binder",
          id: b.id,
          circleId: b.circleId,
          circleName: nameOf(b.circleId),
          title: b.title,
          snippet: b.content.slice(0, 120),
        });
      }
    }
    return hits.slice(0, 40);
  }
}

export const portalStore = new MemoryPortalAdapter();
