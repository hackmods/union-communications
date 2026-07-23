import type { TaskAdapter } from "./adapter";
import type {
  CreateTaskInput,
  Task,
  TaskListFilters,
  UpdateTaskInput,
} from "@/types/task";

const tasks: Task[] = [
  {
    id: "task-001",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    title: "Prepare Step 1 meeting notes for hours grievance",
    assigneeId: "user-steward-243",
    dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "open",
    relatedGrievanceId: "grev-001",
    createdById: "user-president-243",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "task-002",
    unionId: "union-opseu",
    localId: "local-243",
    title: "Confirm LEC room booking for next membership meeting",
    assigneeId: "user-president-243",
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "open",
    createdById: "user-president-243",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "task-003",
    unionId: "union-opseu",
    localId: "local-243",
    title: "Archive closed bumping checklist (done example)",
    assigneeId: "user-stability-243",
    status: "done",
    relatedBumpingCaseId: "bump-001",
    createdById: "user-president-243",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class MemoryTaskAdapter implements TaskAdapter {
  async list(filters: TaskListFilters): Promise<Task[]> {
    let results = tasks.filter((t) => t.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((t) => t.localId === filters.localId);
    }
    if (filters.bargainingUnitId) {
      results = results.filter(
        (t) =>
          !t.bargainingUnitId ||
          t.bargainingUnitId === filters.bargainingUnitId,
      );
    }
    if (filters.assigneeId) {
      results = results.filter((t) => t.assigneeId === filters.assigneeId);
    }
    if (filters.status) {
      results = results.filter((t) => t.status === filters.status);
    }
    if (filters.relatedGrievanceId) {
      results = results.filter(
        (t) => t.relatedGrievanceId === filters.relatedGrievanceId,
      );
    }
    if (filters.relatedBumpingCaseId) {
      results = results.filter(
        (t) => t.relatedBumpingCaseId === filters.relatedBumpingCaseId,
      );
    }
    return results.sort((a, b) => {
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (a.status !== b.status) {
        return a.status === "open" ? -1 : 1;
      }
      if (aDue !== bDue) return aDue - bDue;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async getById(taskId: string): Promise<Task | null> {
    return tasks.find((t) => t.id === taskId) ?? null;
  }

  async create(
    input: CreateTaskInput,
    meta: {
      unionId: string;
      localId: string;
      bargainingUnitId?: string;
      createdById: string;
      assigneeId: string;
    },
  ): Promise<Task> {
    const task: Task = {
      id: id("task"),
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: input.bargainingUnitId ?? meta.bargainingUnitId,
      title: input.title,
      assigneeId: meta.assigneeId,
      dueAt: input.dueAt,
      status: "open",
      relatedGrievanceId: input.relatedGrievanceId,
      relatedBumpingCaseId: input.relatedBumpingCaseId,
      createdById: meta.createdById,
      createdAt: new Date().toISOString(),
    };
    tasks.push(task);
    return task;
  }

  async update(taskId: string, input: UpdateTaskInput): Promise<Task | null> {
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx < 0) return null;
    const existing = tasks[idx];
    const next: Task = { ...existing };
    if (input.title !== undefined) next.title = input.title;
    if (input.assigneeId !== undefined) next.assigneeId = input.assigneeId;
    if (input.status !== undefined) next.status = input.status;
    if (input.dueAt !== undefined) {
      next.dueAt = input.dueAt === null ? undefined : input.dueAt;
    }
    if (input.relatedGrievanceId !== undefined) {
      next.relatedGrievanceId =
        input.relatedGrievanceId === null
          ? undefined
          : input.relatedGrievanceId;
    }
    if (input.relatedBumpingCaseId !== undefined) {
      next.relatedBumpingCaseId =
        input.relatedBumpingCaseId === null
          ? undefined
          : input.relatedBumpingCaseId;
    }
    tasks[idx] = next;
    return next;
  }

  async remove(taskId: string): Promise<boolean> {
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx < 0) return false;
    tasks.splice(idx, 1);
    return true;
  }
}

export const memoryTaskStore: TaskAdapter = new MemoryTaskAdapter();
