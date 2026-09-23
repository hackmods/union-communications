import { and, eq, isNull } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import {
  locals,
  unions,
  users,
} from "@/lib/db/schema/tenant";
import { localMemberships } from "@/lib/db/schema/organization-access";
import { userInvites } from "@/lib/db/schema/auth";

export type MembershipIntegrityCode =
  | "orphan_no_local"
  | "orphan_no_membership"
  | "primary_drift"
  | "multi_primary"
  | "policy_single_violation"
  | "dupe_local_number"
  | "accessible_without_membership"
  | "invite_email_collision"
  | "demo_local_pointer";

export type MembershipIntegritySeverity = "high" | "medium" | "low";

export type MembershipIntegrityIssue = {
  code: MembershipIntegrityCode;
  severity: MembershipIntegritySeverity;
  unionId?: string;
  localId?: string;
  userId?: string;
  inviteId?: string;
  detail: string;
};

const ADMIN_ROLES = ["platform_admin", "union_admin", "division_admin"];

export async function scanMembershipIntegrity(): Promise<{
  issues: MembershipIntegrityIssue[];
  highCount: number;
}> {
  if (!isPostgresConfigured()) {
    return { issues: [], highCount: 0 };
  }
  const db = getDb();
  const issues: MembershipIntegrityIssue[] = [];

  const activeUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      unionId: users.unionId,
      localId: users.localId,
      roles: users.roles,
      accessibleLocalIds: users.accessibleLocalIds,
      isDemo: users.isDemo,
    })
    .from(users)
    .where(and(isNull(users.archivedAt), isNull(users.lockedAt)));

  const memberships = await db
    .select({
      id: localMemberships.id,
      unionId: localMemberships.unionId,
      localId: localMemberships.localId,
      userId: localMemberships.userId,
      status: localMemberships.status,
      isPrimary: localMemberships.isPrimary,
      endedAt: localMemberships.endedAt,
    })
    .from(localMemberships);

  const activeMemberships = memberships.filter(
    (m) => m.status === "active" && !m.endedAt,
  );
  const membershipsByUser = new Map<string, typeof activeMemberships>();
  for (const m of activeMemberships) {
    const list = membershipsByUser.get(m.userId) ?? [];
    list.push(m);
    membershipsByUser.set(m.userId, list);
  }

  const unionRows = await db
    .select({
      id: unions.id,
      membershipPolicy: unions.membershipPolicy,
    })
    .from(unions)
    .where(isNull(unions.archivedAt));
  const policyByUnion = new Map(
    unionRows.map((u) => [u.id, u.membershipPolicy ?? "multi_local"]),
  );

  const localRows = await db
    .select({
      id: locals.id,
      unionId: locals.unionId,
      localNumber: locals.localNumber,
      archivedAt: locals.archivedAt,
      isDemo: locals.isDemo,
    })
    .from(locals);
  const localById = new Map(localRows.map((l) => [l.id, l]));

  // Duplicate local numbers (non-archived)
  const numberGroups = new Map<string, typeof localRows>();
  for (const l of localRows) {
    if (l.archivedAt) continue;
    const key = `${l.unionId}::${l.localNumber}`;
    const list = numberGroups.get(key) ?? [];
    list.push(l);
    numberGroups.set(key, list);
  }
  for (const [, group] of numberGroups) {
    if (group.length < 2) continue;
    for (const l of group) {
      issues.push({
        code: "dupe_local_number",
        severity: "high",
        unionId: l.unionId,
        localId: l.id,
        detail: `Duplicate local number "${l.localNumber}" in union ${l.unionId}`,
      });
    }
  }

  for (const u of activeUsers) {
    if (u.unionId && !u.localId) {
      issues.push({
        code: "orphan_no_local",
        severity: "high",
        userId: u.id,
        unionId: u.unionId,
        detail: `${u.email} has a union but no primary local`,
      });
    }

    if (u.localId) {
      const activeForUser = membershipsByUser.get(u.id) ?? [];
      const hasMembership = activeForUser.some((m) => m.localId === u.localId);
      if (!hasMembership) {
        issues.push({
          code: "orphan_no_membership",
          severity: "high",
          userId: u.id,
          unionId: u.unionId ?? undefined,
          localId: u.localId,
          detail: `${u.email} primary local has no active membership row`,
        });
      }

      const primary = activeForUser.find((m) => m.isPrimary);
      if (primary && primary.localId !== u.localId) {
        issues.push({
          code: "primary_drift",
          severity: "medium",
          userId: u.id,
          unionId: u.unionId ?? undefined,
          localId: u.localId,
          detail: `${u.email} users.local_id differs from primary membership`,
        });
      }

      const local = localById.get(u.localId);
      if (local?.isDemo && !u.isDemo) {
        issues.push({
          code: "demo_local_pointer",
          severity: "medium",
          userId: u.id,
          unionId: u.unionId ?? undefined,
          localId: u.localId,
          detail: `${u.email} (non-demo) points at a demo local`,
        });
      }
    }

    const activeForUser = membershipsByUser.get(u.id) ?? [];
    if (u.unionId) {
      const inUnion = activeForUser.filter((m) => m.unionId === u.unionId);
      const primaries = inUnion.filter((m) => m.isPrimary);
      if (primaries.length > 1) {
        issues.push({
          code: "multi_primary",
          severity: "high",
          userId: u.id,
          unionId: u.unionId,
          detail: `${u.email} has ${primaries.length} primary memberships`,
        });
      }
      if (
        policyByUnion.get(u.unionId) === "single_local" &&
        inUnion.length > 1
      ) {
        issues.push({
          code: "policy_single_violation",
          severity: "high",
          userId: u.id,
          unionId: u.unionId,
          detail: `${u.email} has ${inUnion.length} active locals under single_local policy`,
        });
      }
    }

    const roles = Array.isArray(u.roles) ? u.roles : [];
    const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r));
    if (!isAdmin && Array.isArray(u.accessibleLocalIds)) {
      const memberLocalIds = new Set(
        (membershipsByUser.get(u.id) ?? []).map((m) => m.localId),
      );
      for (const lid of u.accessibleLocalIds) {
        if (!memberLocalIds.has(lid)) {
          issues.push({
            code: "accessible_without_membership",
            severity: "low",
            userId: u.id,
            unionId: u.unionId ?? undefined,
            localId: lid,
            detail: `${u.email} accessibleLocalIds includes ${lid} without membership`,
          });
        }
      }
    }
  }

  // Pending invites colliding with existing accounts
  try {
    const pending = await db
      .select({
        id: userInvites.id,
        email: userInvites.email,
        unionId: userInvites.unionId,
        localId: userInvites.localId,
        status: userInvites.status,
      })
      .from(userInvites)
      .where(eq(userInvites.status, "pending"));

    const usersByEmail = new Map(
      activeUsers.map((u) => [u.email.toLowerCase(), u]),
    );
    for (const invite of pending) {
      const existing = usersByEmail.get(invite.email.toLowerCase());
      if (!existing) continue;
      issues.push({
        code: "invite_email_collision",
        severity: "medium",
        inviteId: invite.id,
        userId: existing.id,
        unionId: invite.unionId,
        localId: invite.localId ?? undefined,
        detail: `Pending invite for ${invite.email} but account already exists`,
      });
    }
  } catch {
    // Invites table may be unavailable on partial hosts — skip.
  }

  const highCount = issues.filter((i) => i.severity === "high").length;
  return { issues, highCount };
}

/** Lightweight high-severity count for site-admin home badge. */
export async function countHighMembershipIntegrityIssues(): Promise<number> {
  if (!isPostgresConfigured()) return 0;
  try {
    const { highCount } = await scanMembershipIntegrity();
    return highCount;
  } catch {
    return 0;
  }
}
