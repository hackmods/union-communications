import { and, eq, gt, isNull } from "drizzle-orm";
import type { AuthorizationActor } from "@/lib/authorization/model";
import { isCrossLocalAdministrator } from "@/lib/authorization/model";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { withRlsContext } from "@/lib/db/rls-context";
import { breakGlassGrants, grievanceParticipants } from "@/lib/db/schema";
import type { Grievance } from "@/types/grievance";

export type GrievanceAccessLevel = "none" | "member_safe" | "summary" | "case_read" | "case_write";

export interface GrievanceAccessDecision {
  allowed: boolean;
  level: GrievanceAccessLevel;
  reason: string;
  relationship?: string;
}

const denied = (reason: string): GrievanceAccessDecision => ({
  allowed: false,
  level: "none",
  reason,
});

export function isValidGrievanceParticipant(input: {
  userId: string;
  relationship: string;
  accessLevel: string;
}, grievance: Grievance): boolean {
  if (input.relationship === "member") {
    return input.userId === grievance.memberUserId && input.accessLevel === "member_safe";
  }
  if (!["case_worker", "representative", "observer"].includes(input.relationship)) return false;
  if (input.accessLevel === "member_safe") return false;
  if (input.relationship === "case_worker" && input.accessLevel !== "case_write") return false;
  return ["summary", "case_read", "case_write"].includes(input.accessLevel);
}

function hasMembership(actor: AuthorizationActor, grievance: Grievance): boolean {
  return actor.memberships.some((membership) =>
    membership.unionId === grievance.unionId && membership.localId === grievance.localId,
  );
}

function isPosition(actor: AuthorizationActor, grievance: Grievance, positions: string[]): string | undefined {
  return actor.assignments.find((assignment) =>
    assignment.unionId === grievance.unionId &&
    assignment.localId === grievance.localId &&
    positions.includes(assignment.position),
  )?.position;
}

async function explicitParticipant(grievanceId: string, userId: string) {
  const rows = await getDb().select({
    relationship: grievanceParticipants.relationship,
    accessLevel: grievanceParticipants.accessLevel,
  }).from(grievanceParticipants).where(and(
    eq(grievanceParticipants.grievanceId, grievanceId),
    eq(grievanceParticipants.userId, userId),
    isNull(grievanceParticipants.revokedAt),
  )).limit(1);
  return rows[0];
}

async function activeBreakGlass(grievanceId: string, userId: string) {
  const rows = await getDb().select({ id: breakGlassGrants.id }).from(breakGlassGrants).where(and(
    eq(breakGlassGrants.grievanceId, grievanceId),
    eq(breakGlassGrants.userId, userId),
    isNull(breakGlassGrants.revokedAt),
    gt(breakGlassGrants.expiresAt, new Date()),
  )).limit(1);
  return rows[0];
}

/**
 * Resolve a grievance relationship only after its parent row has been loaded
 * under the request's tenant RLS context. Case privacy is applied here so all
 * APIs share one default access matrix.
 */
export async function authorizeGrievance(
  actor: AuthorizationActor,
  grievance: Grievance,
): Promise<GrievanceAccessDecision> {
  if (!actor.accountActive) return denied("inactive_account");
  if (!actor.unionId || actor.unionId !== grievance.unionId) return denied("union_mismatch");

  const canCheckDatabase = isPostgresConfigured() && actor.source === "database";
  let participant: { relationship: string; accessLevel: string } | undefined;
  let breakGlass: { id: string } | undefined;
  if (canCheckDatabase) {
    const isBreakGlassRole = actor.roles.includes("platform_admin") && actor.mfaVerified;
    const crossLocal = isCrossLocalAdministrator(actor);
    const scope = {
      unionId: actor.unionId,
      localId: grievance.localId,
      userId: actor.userId,
      crossLocal,
    };
    const resolved = await withRlsContext(scope, async () => {
      const membership = await explicitParticipant(grievance.id, actor.userId);
      const grant = isBreakGlassRole ? await activeBreakGlass(grievance.id, actor.userId) : undefined;
      return { membership, grant };
    });
    participant = resolved.membership;
    breakGlass = resolved.grant;
  }

  if (breakGlass && actor.roles.includes("platform_admin") && actor.mfaVerified) {
    return { allowed: true, level: "case_write", reason: "break_glass", relationship: breakGlass.id };
  }
  if (!hasMembership(actor, grievance)) return denied("active_local_membership_required");

  if (participant?.relationship === "member") {
    if (!isValidGrievanceParticipant({ userId: actor.userId, ...participant }, grievance)) {
      return denied("invalid_member_participant");
    }
    return { allowed: true, level: "member_safe", reason: "involved_member", relationship: "member" };
  }

  if (grievance.memberUserId === actor.userId) {
    if (participant) {
      // Explicit case-team assignment is an intentional override for a member
      // who also serves on the case team.
    } else {
      return { allowed: true, level: "member_safe", reason: "involved_member", relationship: "member" };
    }
  }

  if (participant) {
    if (!isValidGrievanceParticipant({ userId: actor.userId, ...participant }, grievance)) {
      return denied("invalid_case_worker_access_level");
    }
    const levels: Record<string, GrievanceAccessLevel> = {
      member_safe: "member_safe",
      summary: "summary",
      case_read: "case_read",
      case_write: "case_write",
    };
    return {
      allowed: true,
      level: levels[participant.accessLevel] ?? "none",
      reason: "explicit_participant",
      relationship: participant.relationship,
    };
  }

  if (grievance.assignedStewardId === actor.userId) {
    return { allowed: true, level: "case_write", reason: "assigned_case_worker", relationship: "case_worker" };
  }

  if (isPosition(actor, grievance, ["grievance_officer"])) {
    return { allowed: true, level: "case_write", reason: "grievance_officer", relationship: "grievance_officer" };
  }

  const restricted = (grievance.privacyMode ?? "standard") === "restricted";
  if (!restricted) {
    if (isPosition(actor, grievance, ["president", "vice_president"])) {
      return { allowed: true, level: "case_write", reason: "local_leadership", relationship: "president_or_vice_president" };
    }
    if (isPosition(actor, grievance, ["executive_member"])) {
      return { allowed: true, level: "summary", reason: "executive_summary", relationship: "executive_member" };
    }
    const delegated = actor.delegations.find((delegation) =>
      delegation.unionId === grievance.unionId &&
      delegation.localId === grievance.localId &&
      ["grievances.case.read", "grievances.case.write"].includes(delegation.capability) &&
      new Date(delegation.endsAt).getTime() > Date.now(),
    );
    if (delegated) {
      return {
        allowed: true,
        level: delegated.capability === "grievances.case.write" ? "case_write" : "case_read",
        reason: "active_delegation",
        relationship: delegated.grantorUserId,
      };
    }
  }

  return denied(restricted ? "restricted_case_assignment_required" : "case_assignment_required");
}

export function grievanceSummary(grievance: Grievance) {
  return {
    id: grievance.id,
    category: grievance.category,
    status: grievance.status,
    currentStep: grievance.currentStep,
    filedAt: grievance.filedAt,
    resolvedAt: grievance.resolvedAt ?? null,
  };
}
