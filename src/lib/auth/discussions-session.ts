import { auth } from "@/auth";
import type { Session } from "next-auth";
import {
  canAccessDiscussionsModule,
  canCrossLocalDiscussions,
  canViewDiscussionThreadBase,
} from "@/lib/discussions/access";
import {
  assertGrievanceEdit,
  assertGrievanceView,
} from "@/lib/auth/grievance-session";
import { canEditBumpingCase, canViewBumpingCase } from "@/lib/bumping/access";
import { getTenantContext } from "@/lib/tenant/loader";
import { grievanceStore } from "@/lib/grievance/store";
import { bumpingStore } from "@/lib/bumping/store";
import type { DiscussionThread } from "@/types/discussions";
import type { UserRole } from "@/types/tenant";

export type DiscussionsSessionResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string };

export async function requireDiscussionsSession(): Promise<DiscussionsSessionResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!session.user.mfaVerified) {
    return { ok: false, status: 403, error: "MFA required" };
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessDiscussionsModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!isDiscussionsModuleEnabled(session)) {
    return { ok: false, status: 403, error: "Module not enabled" };
  }
  return { ok: true, session };
}

export function isDiscussionsModuleEnabled(session: Session): boolean {
  if (!session.user.unionId) return false;
  const tenant = getTenantContext(session.user.unionId);
  return tenant?.union.enabledModules.includes("discussions") ?? false;
}

export function listFiltersForDiscussionsSession(session: Session) {
  const roles = (session.user.roles ?? []) as UserRole[];
  const unionId = session.user.unionId;
  if (!unionId) {
    return { unionId: "__none__", localId: undefined as string | undefined };
  }

  const crossLocal = canCrossLocalDiscussions(roles);
  return {
    unionId,
    localId: session.user.localId,
    bargainingUnitId: session.user.bargainingUnitId,
    ...(crossLocal && !session.user.localId
      ? { localId: undefined, bargainingUnitId: undefined }
      : {}),
  };
}

export function tenantIdsForDiscussionsSession(session: Session) {
  const unionId =
    session.user.unionId ?? `solo-union-${session.user.id}`;
  const localId =
    session.user.localId ?? `solo-local-${session.user.id}`;
  return { unionId, localId };
}

/**
 * Full view check: base local scope + linked case ACL when present.
 */
export async function assertDiscussionThreadView(
  session: Session,
  thread: DiscussionThread,
): Promise<boolean> {
  const roles = (session.user.roles ?? []) as UserRole[];
  if (
    !canViewDiscussionThreadBase(
      thread,
      session.user.id,
      session.user.unionId,
      session.user.localId,
      roles,
    )
  ) {
    return false;
  }

  if (thread.grievanceId) {
    const related = await grievanceStore.getById(thread.grievanceId);
    if (!related) return false;
    return assertGrievanceView(session, related.grievance);
  }

  if (thread.bumpingCaseId) {
    const related = await bumpingStore.getById(thread.bumpingCaseId);
    if (!related) return false;
    return canViewBumpingCase(
      related.bumpingCase,
      session.user.unionId,
      session.user.localId,
      roles,
    );
  }

  return true;
}

/**
 * Post / create-linked-thread: standalone uses base view;
 * grievance-linked requires edit ACL; bumping-linked requires write ACL.
 */
export async function assertDiscussionThreadPost(
  session: Session,
  thread: DiscussionThread,
): Promise<boolean> {
  const roles = (session.user.roles ?? []) as UserRole[];
  if (
    !canViewDiscussionThreadBase(
      thread,
      session.user.id,
      session.user.unionId,
      session.user.localId,
      roles,
    )
  ) {
    return false;
  }

  if (thread.grievanceId) {
    const related = await grievanceStore.getById(thread.grievanceId);
    if (!related) return false;
    return assertGrievanceEdit(session, related.grievance);
  }

  if (thread.bumpingCaseId) {
    const related = await bumpingStore.getById(thread.bumpingCaseId);
    if (!related) return false;
    return canEditBumpingCase(
      related.bumpingCase,
      session.user.unionId,
      session.user.localId,
      roles,
    );
  }

  return true;
}

/** Whether the session may create a new thread with the given optional links. */
export async function assertCanCreateDiscussionThread(
  session: Session,
  links: { grievanceId?: string; bumpingCaseId?: string },
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canAccessDiscussionsModule(roles)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (links.grievanceId && links.bumpingCaseId) {
    return {
      ok: false,
      status: 400,
      error: "Thread cannot link to both a grievance and a bumping case",
    };
  }

  if (links.grievanceId) {
    const related = await grievanceStore.getById(links.grievanceId);
    if (!related) {
      return { ok: false, status: 404, error: "Grievance not found" };
    }
    if (!assertGrievanceEdit(session, related.grievance)) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: true };
  }

  if (links.bumpingCaseId) {
    const related = await bumpingStore.getById(links.bumpingCaseId);
    if (!related) {
      return { ok: false, status: 404, error: "Bumping case not found" };
    }
    if (
      !canEditBumpingCase(
        related.bumpingCase,
        session.user.unionId,
        session.user.localId,
        roles,
      )
    ) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: true };
  }

  return { ok: true };
}
