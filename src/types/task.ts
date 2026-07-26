import type { HubReaction } from "@/types/hub-social";

/** FEAT-003 — Hub task / to-do entity */

export type TaskStatus = "open" | "done";

export interface Task {
  id: string;
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  title: string;
  notes?: string;
  assigneeId: string;
  dueAt?: string;
  status: TaskStatus;
  relatedGrievanceId?: string;
  relatedBumpingCaseId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  mentionedUserIds: string[];
  reactions: HubReaction[];
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  /** Defaults to creator when omitted (self-assign). */
  assigneeId?: string;
  dueAt?: string;
  bargainingUnitId?: string;
  relatedGrievanceId?: string;
  relatedBumpingCaseId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  assigneeId?: string;
  dueAt?: string | null;
  status?: TaskStatus;
  relatedGrievanceId?: string | null;
  relatedBumpingCaseId?: string | null;
  mentionedUserIds?: string[];
}

export interface TaskListFilters {
  unionId: string;
  localId?: string;
  bargainingUnitId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  relatedGrievanceId?: string;
  relatedBumpingCaseId?: string;
}
