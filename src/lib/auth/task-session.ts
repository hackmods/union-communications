import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import type { Session } from "next-auth";
import {
  canAccessTasksModule,
  canCrossLocalTasks,
  canDeleteTask,
  canEditTaskFields,
  canMutateTaskAssignment,
  canViewTask,
  isElevatedTaskRole,
} from "@/lib/tasks/access";
import { getTenantContext } from "@/lib/tenant/loader";
import type { Task } from "@/types/task";
import type { UserRole } from "@/types/tenant";

export type TaskSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireTaskSession(): Promise<TaskSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!sessionMfaOk(session)) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessTasksModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!isTasksModuleEnabled(session)) {
    return { ok: false, status: 403, error: "Module not enabled" };
  }
  return { ok: true, session };
}

export function isTasksModuleEnabled(session: Session): boolean {
  if (!session.user.unionId) return false;
  const tenant = getTenantContext(session.user.unionId);
  return tenant?.union.enabledModules.includes("tasks") ?? false;
}

export function assertTaskView(session: Session, task: Task): boolean {
  return canViewTask(
    task,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function assertTaskMutateAssignment(
  session: Session,
  task: Task,
): boolean {
  return canMutateTaskAssignment(
    task,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function assertTaskEditFields(session: Session, task: Task): boolean {
  return canEditTaskFields(
    task,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function assertTaskDelete(session: Session, task: Task): boolean {
  return canDeleteTask(
    task,
    session.user.id,
    session.user.unionId,
    session.user.localId,
    (session.user.roles ?? []) as UserRole[],
  );
}

export function listFiltersForTaskSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined };
  }

  if (roles.includes("solo_account")) {
    return {
      unionId,
      assigneeId: session.user.id,
    };
  }

  const crossLocal = canCrossLocalTasks(roles);
  return {
    unionId,
    localId: session.user.localId,
    bargainingUnitId: session.user.bargainingUnitId,
    ...(crossLocal && !session.user.localId
      ? { localId: undefined, bargainingUnitId: undefined }
      : {}),
  };
}

export function tenantIdsForTaskSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return {
    unionId,
    localId,
    bargainingUnitId: session.user.bargainingUnitId,
  };
}

export function isElevatedTaskSession(session: Session): boolean {
  return isElevatedTaskRole((session.user.roles ?? []) as UserRole[]);
}
