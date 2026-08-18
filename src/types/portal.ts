/** Local Portal Circles — ADR-017. Solidarity product names only. */

export type CircleKind = "local_hall" | "committee" | "campaign" | "ad_hoc";
export type CircleVisibility = "circle_only" | "local_members" | "invited";
export type CircleMemberRole = "viewer" | "member" | "admin";

/** Tools that can be muted per membership (Dispatch quiet). */
export type PortalToolMute =
  | "bulletin"
  | "actions"
  | "floor"
  | "rollCall"
  | "pipeline";

export interface PortalAuditEntry {
  id: string;
  unionId: string;
  circleId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

export interface Circle {
  id: string;
  unionId: string;
  localId?: string;
  kind: CircleKind;
  name: string;
  description?: string;
  visibility: CircleVisibility;
  /** Fronts portfolio window (optional) */
  frontStartsAt?: string;
  frontEndsAt?: string;
  archivedAt?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CircleMembership {
  id: string;
  circleId: string;
  userId: string;
  userName: string;
  role: CircleMemberRole;
  muted: boolean;
  /** Per-tool mute (in addition to whole-Circle mute). */
  mutedTools: PortalToolMute[];
  starred: boolean;
  joinedAt: string;
}

export interface BulletinPost {
  id: string;
  circleId: string;
  unionId: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  pinned: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulletinComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface ActionItem {
  id: string;
  circleId: string;
  unionId: string;
  listName: string;
  title: string;
  notes?: string;
  assigneeId?: string;
  assigneeName?: string;
  dueAt?: string;
  completedAt?: string;
  deletedAt?: string;
  sourceBulletinPostId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  circleId: string;
  unionId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  /** Optional external RSVP / meeting URL (read-only link until UnionMeeting lands). */
  externalUrl?: string;
  createdById: string;
  createdAt: string;
}

export interface BinderItem {
  id: string;
  circleId: string;
  unionId: string;
  title: string;
  folder?: string;
  /** Memory MVP: text/url placeholder until object storage */
  content: string;
  contentType: "note" | "link" | "file_meta";
  createdById: string;
  createdByName: string;
  deletedAt?: string;
  createdAt: string;
}

export interface FloorMessage {
  id: string;
  circleId: string;
  unionId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface RollCallQuestion {
  id: string;
  circleId: string;
  unionId: string;
  question: string;
  cadence: "weekly" | "biweekly" | "monthly";
  active: boolean;
  createdAt: string;
}

export interface RollCallAnswer {
  id: string;
  questionId: string;
  circleId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface PipelineColumn {
  id: string;
  boardId: string;
  name: string;
  position: number;
}

export interface PipelineCard {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  body?: string;
  position: number;
  createdAt: string;
}

export interface PipelineBoard {
  id: string;
  circleId: string;
  unionId: string;
  name: string;
}

export type DispatchKind =
  | "mention"
  | "assignment"
  | "due_soon"
  | "bulletin"
  | "roll_call"
  | "pipeline";

export interface DispatchItem {
  id: string;
  unionId: string;
  userId: string;
  circleId: string;
  circleName: string;
  kind: DispatchKind;
  title: string;
  body?: string;
  readAt?: string;
  createdAt: string;
}

export interface StationPayload {
  circles: Array<
    Circle & {
      membership: CircleMembership;
      overdueActions: number;
      dispatchUnread: number;
    }
  >;
  myActions: ActionItem[];
  recentBulletin: BulletinPost[];
  dispatchUnread: number;
  upcomingEvents: Array<CalendarEvent & { circleName: string }>;
  /** This-week digest line counts */
  weekDigest: {
    bulletinPosts: number;
    actionsCompleted: number;
    floorMessages: number;
  };
}

/** Momentum = progress narrative (0 = stuck/uphill, 100 = shipped). */
export interface MomentumItem {
  id: string;
  circleId: string;
  unionId: string;
  title: string;
  notes?: string;
  /** 0–100 */
  progress: number;
  updatedById: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SidebarThread {
  id: string;
  unionId: string;
  participantIds: [string, string];
  participantNames: [string, string];
  updatedAt: string;
}

export interface SidebarMessage {
  id: string;
  threadId: string;
  unionId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export type PortalSearchHit =
  | { kind: "bulletin"; id: string; circleId: string; circleName: string; title: string; snippet: string }
  | { kind: "action"; id: string; circleId: string; circleName: string; title: string; snippet: string }
  | { kind: "binder"; id: string; circleId: string; circleName: string; title: string; snippet: string }
  | { kind: "circle"; id: string; circleId: string; circleName: string; title: string; snippet: string };

export interface CircleDetailPayload {
  circle: Circle;
  membership: CircleMembership;
  roster: CircleMembership[];
  bulletin: BulletinPost[];
  comments: BulletinComment[];
  actions: ActionItem[];
  calendar: CalendarEvent[];
  binder: BinderItem[];
  floor: FloorMessage[];
  rollCallQuestions: RollCallQuestion[];
  rollCallAnswers: RollCallAnswer[];
  pipelineBoard: PipelineBoard | null;
  pipelineColumns: PipelineColumn[];
  pipelineCards: PipelineCard[];
  momentum: MomentumItem[];
}
