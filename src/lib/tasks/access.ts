import type { Task } from "@/types/task";
import type { UserRole } from "@/types/tenant";

/** Any hub role may access the tasks module (create / self-assign). */
const TASK_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_steward",
  "local_exec",
  "stability_member",
  "solo_account",
];

/** Elevated officers may mark done / reassign any local task (not local_exec). */
const TASK_ELEVATED_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
];

const CROSS_LOCAL_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "division_admin",
];

export function canAccessTasksModule(roles: UserRole[]): boolean {
  return roles.some((r) => TASK_ROLES.includes(r));
}

export function isElevatedTaskRole(roles: UserRole[]): boolean {
  return roles.some((r) => TASK_ELEVATED_ROLES.includes(r));
}

export function canCrossLocalTasks(roles: UserRole[]): boolean {
  return roles.some((r) => CROSS_LOCAL_ROLES.includes(r));
}

export function canViewTask(
  task: Task,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canAccessTasksModule(roles)) return false;
  if (!unionId || task.unionId !== unionId) return false;

  if (roles.includes("solo_account")) {
    return task.assigneeId === userId || task.createdById === userId;
  }

  if (localId && task.localId !== localId) {
    if (!canCrossLocalTasks(roles)) return false;
  }

  return true;
}

/** Create + self-assign: any hub role with module access. */
export function canCreateTask(roles: UserRole[]): boolean {
  return canAccessTasksModule(roles);
}

/**
 * Assign to someone other than self — elevated only.
 * Self-assign is always allowed for creators.
 */
export function canAssignOthers(roles: UserRole[]): boolean {
  return isElevatedTaskRole(roles);
}

/**
 * Mark done / reassign: assignee or elevated.
 * local_exec mirrors grievance (not elevated) — may act only when assignee.
 */
export function canMutateTaskAssignment(
  task: Task,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canViewTask(task, userId, unionId, localId, roles)) return false;
  if (task.assigneeId === userId) return true;
  return isElevatedTaskRole(roles);
}

/** Title / due / related fields: creator, assignee, or elevated. */
export function canEditTaskFields(
  task: Task,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canViewTask(task, userId, unionId, localId, roles)) return false;
  if (task.createdById === userId || task.assigneeId === userId) return true;
  return isElevatedTaskRole(roles);
}

/** Delete: creator or elevated. */
export function canDeleteTask(
  task: Task,
  userId: string,
  unionId: string | undefined,
  localId: string | undefined,
  roles: UserRole[],
): boolean {
  if (!canViewTask(task, userId, unionId, localId, roles)) return false;
  if (task.createdById === userId) return true;
  return isElevatedTaskRole(roles);
}
