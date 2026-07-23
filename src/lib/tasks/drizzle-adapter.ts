import { and, eq, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import type { TaskAdapter } from "./adapter";
import type {
  CreateTaskInput,
  Task,
  TaskListFilters,
  TaskStatus,
  UpdateTaskInput,
} from "@/types/task";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapTask(row: typeof tasks.$inferSelect): Task {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    title: row.title,
    assigneeId: row.assigneeId,
    dueAt: toIso(row.dueAt),
    status: row.status as TaskStatus,
    relatedGrievanceId: row.relatedGrievanceId ?? undefined,
    relatedBumpingCaseId: row.relatedBumpingCaseId ?? undefined,
    createdById: row.createdById,
    createdAt: toIso(row.createdAt)!,
  };
}

function sortTasks(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (a.status !== b.status) {
      return a.status === "open" ? -1 : 1;
    }
    if (aDue !== bDue) return aDue - bDue;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export class DrizzleTaskAdapter implements TaskAdapter {
  async list(filters: TaskListFilters): Promise<Task[]> {
    const db = getDb();
    const conditions = [eq(tasks.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(tasks.localId, filters.localId));
    }
    if (filters.bargainingUnitId) {
      conditions.push(
        or(
          isNull(tasks.bargainingUnitId),
          eq(tasks.bargainingUnitId, filters.bargainingUnitId),
        )!,
      );
    }
    if (filters.assigneeId) {
      conditions.push(eq(tasks.assigneeId, filters.assigneeId));
    }
    if (filters.status) {
      conditions.push(eq(tasks.status, filters.status));
    }
    if (filters.relatedGrievanceId) {
      conditions.push(eq(tasks.relatedGrievanceId, filters.relatedGrievanceId));
    }
    if (filters.relatedBumpingCaseId) {
      conditions.push(
        eq(tasks.relatedBumpingCaseId, filters.relatedBumpingCaseId),
      );
    }
    const rows = await db
      .select()
      .from(tasks)
      .where(and(...conditions));
    return sortTasks(rows.map(mapTask));
  }

  async getById(id: string): Promise<Task | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    return rows[0] ? mapTask(rows[0]) : null;
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
    const db = getDb();
    const id = newId("task");
    const ts = new Date();
    await db.insert(tasks).values({
      id,
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: input.bargainingUnitId ?? meta.bargainingUnitId,
      title: input.title,
      assigneeId: meta.assigneeId,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      status: "open",
      relatedGrievanceId: input.relatedGrievanceId,
      relatedBumpingCaseId: input.relatedBumpingCaseId,
      createdById: meta.createdById,
      createdAt: ts,
    });
    const created = await this.getById(id);
    if (!created) throw new Error("Failed to create task");
    return created;
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const patch: Partial<typeof tasks.$inferInsert> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.assigneeId !== undefined) patch.assigneeId = input.assigneeId;
    if (input.status !== undefined) patch.status = input.status;
    if (input.dueAt !== undefined) {
      patch.dueAt = input.dueAt === null ? null : new Date(input.dueAt);
    }
    if (input.relatedGrievanceId !== undefined) {
      patch.relatedGrievanceId =
        input.relatedGrievanceId === null ? null : input.relatedGrievanceId;
    }
    if (input.relatedBumpingCaseId !== undefined) {
      patch.relatedBumpingCaseId =
        input.relatedBumpingCaseId === null
          ? null
          : input.relatedBumpingCaseId;
    }

    if (Object.keys(patch).length === 0) return existing;

    const db = getDb();
    await db.update(tasks).set(patch).where(eq(tasks.id, id));
    return this.getById(id);
  }

  async remove(id: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id });
    return deleted.length > 0;
  }
}
