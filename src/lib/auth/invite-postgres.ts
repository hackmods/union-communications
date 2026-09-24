import { randomBytes } from "crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { UserRole } from "@/types/tenant";
import { hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db/client";
import { applyRlsContext } from "@/lib/db/rls-context";
import { userInvites } from "@/lib/db/schema/auth";
import { users } from "@/lib/db/schema/tenant";
import { localMemberships, officerAssignments } from "@/lib/db/schema/organization-access";
import { locals } from "@/lib/db/schema/tenant";
import { verifyPassword } from "@/lib/auth/password";

export function invitesPostgresEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    Boolean(env.DATABASE_URL?.trim())
  );
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export type UpsertPostgresUserInput = {
  email: string;
  name: string;
  password: string;
  unionId?: string;
  localId?: string;
  divisionId?: string;
  bargainingUnitId?: string;
  accessibleLocalIds?: string[];
  roles: UserRole[];
  totpSecret?: string | null;
  mfaEnabled?: boolean;
  /** When set, update this user id instead of upserting by email. */
  userId?: string;
  /** Demo roster flag — site-admin purge registry. */
  isDemo?: boolean;
};

/** Create or update a durable Hub user (bootstrap + invite accept). */
export async function upsertPostgresUser(
  input: UpsertPostgresUserInput,
): Promise<{ id: string; created: boolean }> {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const values = {
    email,
    name: input.name.trim(),
    passwordHash,
    unionId: input.unionId ?? null,
    localId: input.localId ?? null,
    divisionId: input.divisionId ?? null,
    bargainingUnitId: input.bargainingUnitId ?? null,
    accessibleLocalIds: input.accessibleLocalIds ?? null,
    roles: input.roles,
    totpSecret: input.totpSecret ?? null,
    mfaEnabled: input.mfaEnabled ?? false,
    ...(input.isDemo !== undefined ? { isDemo: input.isDemo } : {}),
  };

  if (input.userId) {
    const byId = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    if (byId[0]) {
      await db
        .update(users)
        .set(values)
        .where(eq(users.id, input.userId));
      return { id: input.userId, created: false };
    }
    const byEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (byEmail[0]) {
      // Stable demo ids win: retarget the email row when the preferred id is free.
      await db
        .update(users)
        .set(values)
        .where(eq(users.id, byEmail[0].id));
      return { id: byEmail[0].id, created: false };
    }
    await db.insert(users).values({ id: input.userId, ...values });
    return { id: input.userId, created: true };
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    await db.update(users).set(values).where(eq(users.id, existing[0].id));
    return { id: existing[0].id, created: false };
  }

  const id = newId("user");
  await db.insert(users).values({ id, ...values });
  return { id, created: true };
}

export type CreateInviteInput = {
  email: string;
  name: string;
  unionId: string;
  localId?: string;
  divisionId?: string;
  bargainingUnitId?: string;
  roles: UserRole[];
  invitedById: string;
  ttlHours?: number;
};

export type InviteRow = {
  id: string;
  token: string;
  email: string;
  name: string;
  unionId: string;
  localId?: string;
  divisionId?: string;
  bargainingUnitId?: string;
  roles: UserRole[];
  invitedById: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
};

function mapInvite(row: typeof userInvites.$inferSelect): InviteRow {
  return {
    id: row.id,
    token: row.token,
    email: row.email,
    name: row.name,
    unionId: row.unionId,
    localId: row.localId ?? undefined,
    divisionId: row.divisionId ?? undefined,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    roles: row.roles as UserRole[],
    invitedById: row.invitedById,
    status: row.status,
    expiresAt: toIso(row.expiresAt)!,
    createdAt: toIso(row.createdAt)!,
    acceptedAt: toIso(row.acceptedAt),
  };
}

export async function createInvitePostgres(
  input: CreateInviteInput,
): Promise<InviteRow> {
  const db = getDb();
  const now = Date.now();
  const ttl = (input.ttlHours ?? 72) * 60 * 60 * 1000;
  const row = {
    id: newId("inv"),
    token: randomBytes(24).toString("base64url"),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    unionId: input.unionId,
    localId: input.localId ?? null,
    divisionId: input.divisionId ?? null,
    bargainingUnitId: input.bargainingUnitId ?? null,
    roles: input.roles,
    invitedById: input.invitedById,
    status: "pending" as const,
    expiresAt: new Date(now + ttl),
    createdAt: new Date(now),
  };
  const [inserted] = await db.insert(userInvites).values(row).returning();
  return mapInvite(inserted);
}

export async function getInviteByTokenPostgres(
  token: string,
): Promise<InviteRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userInvites)
    .where(eq(userInvites.token, token))
    .limit(1);
  return rows[0] ? mapInvite(rows[0]) : null;
}

export async function listInvitesPostgres(input: {
  unionId: string;
  localId?: string;
}): Promise<InviteRow[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userInvites)
    .where(eq(userInvites.unionId, input.unionId));
  return rows
    .map(mapInvite)
    .filter((row) => !input.localId || row.localId === input.localId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function acceptInvitePostgres(
  token: string,
  password: string,
): Promise<{ userId?: string; error?: string }> {
  const invite = await getInviteByTokenPostgres(token);
  if (!invite) return { error: "Invite not found" };
  if (invite.status !== "pending") {
    return { error: "Invite is no longer pending" };
  }
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    const db = getDb();
    await db
      .update(userInvites)
      .set({ status: "expired" })
      .where(eq(userInvites.id, invite.id));
    return { error: "Invite expired" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const [lockedInvite] = await tx.select().from(userInvites)
      .where(eq(userInvites.id, invite.id)).for("update").limit(1);
    if (!lockedInvite || lockedInvite.status !== "pending") return { error: "Invite is no longer pending" };
    if (invite.localId) {
      const [local] = await tx.select({ id: locals.id }).from(locals).where(and(
        eq(locals.id, invite.localId), eq(locals.unionId, invite.unionId),
      )).limit(1);
      if (!local) return { error: "Invite local does not belong to this union" };
    }

    const [existing] = await tx.select().from(users)
      .where(eq(users.email, invite.email.toLowerCase())).for("update").limit(1);
    let userId: string;
    if (existing) {
      if (existing.unionId !== invite.unionId) return { error: "This account belongs to another union" };
      if (existing.archivedAt || existing.lockedAt) return { error: "This account is not active" };
      if (!(await verifyPassword(password, existing.passwordHash))) return { error: "The existing account password is incorrect" };
      userId = existing.id;
      const mergedRoles = [...new Set([...(existing.roles as UserRole[]), ...invite.roles])];
      const accessibleLocalIds = [...new Set([...(existing.accessibleLocalIds ?? []), ...(invite.localId ? [invite.localId] : [])])];
      await tx.update(users).set({
        roles: mergedRoles,
        accessibleLocalIds,
        localId: existing.localId ?? invite.localId ?? null,
        divisionId: existing.divisionId ?? invite.divisionId ?? null,
        bargainingUnitId: existing.bargainingUnitId ?? invite.bargainingUnitId ?? null,
        sessionVersion: existing.sessionVersion + 1,
      }).where(eq(users.id, existing.id));
    } else {
      userId = newId("user");
      await tx.insert(users).values({
        id: userId,
        email: invite.email.toLowerCase(),
        name: invite.name,
        passwordHash: await hashPassword(password),
        unionId: invite.unionId,
        localId: invite.localId ?? null,
        divisionId: invite.divisionId ?? null,
        bargainingUnitId: invite.bargainingUnitId ?? null,
        accessibleLocalIds: invite.localId ? [invite.localId] : [],
        roles: invite.roles,
        mfaEnabled: false,
        sessionVersion: 0,
      });
    }

    if (invite.localId) {
      // The invitation creator is the authorized grantor for membership and
      // pending office assignments. Keep that identity in RLS while recording
      // the new user's membership; the userId is still linked in every row.
      await applyRlsContext(tx, { unionId: invite.unionId, localId: invite.localId, userId: invite.invitedById });
      const [existingMembership] = await tx.select({ id: localMemberships.id, isPrimary: localMemberships.isPrimary }).from(localMemberships).where(and(
        eq(localMemberships.unionId, invite.unionId), eq(localMemberships.localId, invite.localId),
        eq(localMemberships.userId, userId),
      )).limit(1);
      const primary = !existing || !existing.localId || existing.localId === invite.localId;
      if (existingMembership) {
        await tx.update(localMemberships).set({
          status: "active", endedAt: null, startedAt: new Date(),
          bargainingUnitId: invite.bargainingUnitId ?? null,
          isPrimary: primary || existingMembership.isPrimary,
        }).where(eq(localMemberships.id, existingMembership.id));
      } else {
        await tx.insert(localMemberships).values({
          id: newId("lm"), unionId: invite.unionId, localId: invite.localId, userId,
          bargainingUnitId: invite.bargainingUnitId ?? null, status: "active", isPrimary: primary,
          createdById: invite.invitedById,
        });
      }
      const positions: Array<[UserRole, "president" | "steward" | "executive_member"]> = [
        ["local_president", "president"], ["local_steward", "steward"], ["local_exec", "executive_member"],
      ];
      for (const [role, position] of positions) {
        if (!invite.roles.includes(role)) continue;
        const [activeAssignment] = await tx.select({ id: officerAssignments.id }).from(officerAssignments).where(and(
          eq(officerAssignments.unionId, invite.unionId), eq(officerAssignments.localId, invite.localId),
          eq(officerAssignments.userId, userId), eq(officerAssignments.position, position), isNull(officerAssignments.revokedAt),
        )).limit(1);
        if (!activeAssignment) await tx.insert(officerAssignments).values({
          id: newId("oa"), unionId: invite.unionId, localId: invite.localId, userId,
          position, assignedById: invite.invitedById,
        });
      }
      await tx.execute(sql`SELECT app_sync_local_portal_membership(${invite.unionId}, ${invite.localId}, ${userId})`);
    }
    await tx.update(userInvites).set({ status: "accepted", acceptedAt: new Date() }).where(eq(userInvites.id, invite.id));
    return { userId };
  });
}

/**
 * Ensure primary local membership + officer assignments exist for a durable
 * user (seed-admin / assign restore). Idempotent.
 */
export async function ensurePrimaryLocalAuthority(input: {
  userId: string;
  unionId: string;
  localId: string;
  roles: UserRole[];
  bargainingUnitId?: string;
  createdById?: string;
}): Promise<void> {
  const db = getDb();
  const grantorId = input.createdById ?? input.userId;
  await db.transaction(async (tx) => {
    await applyRlsContext(tx, {
      unionId: input.unionId,
      localId: input.localId,
      userId: grantorId,
      crossLocal: true,
      mfaVerified: true,
    });
    const [existingMembership] = await tx
      .select({ id: localMemberships.id, isPrimary: localMemberships.isPrimary })
      .from(localMemberships)
      .where(
        and(
          eq(localMemberships.unionId, input.unionId),
          eq(localMemberships.localId, input.localId),
          eq(localMemberships.userId, input.userId),
        ),
      )
      .limit(1);
    if (existingMembership) {
      await tx
        .update(localMemberships)
        .set({
          status: "active",
          endedAt: null,
          startedAt: new Date(),
          bargainingUnitId: input.bargainingUnitId ?? null,
          isPrimary: true,
        })
        .where(eq(localMemberships.id, existingMembership.id));
    } else {
      await tx.insert(localMemberships).values({
        id: newId("lm"),
        unionId: input.unionId,
        localId: input.localId,
        userId: input.userId,
        bargainingUnitId: input.bargainingUnitId ?? null,
        status: "active",
        isPrimary: true,
        createdById: grantorId,
      });
    }
    const positions: Array<[UserRole, "president" | "steward" | "executive_member"]> = [
      ["local_president", "president"],
      ["local_steward", "steward"],
      ["local_exec", "executive_member"],
    ];
    for (const [role, position] of positions) {
      if (!input.roles.includes(role)) continue;
      const [activeAssignment] = await tx
        .select({ id: officerAssignments.id })
        .from(officerAssignments)
        .where(
          and(
            eq(officerAssignments.unionId, input.unionId),
            eq(officerAssignments.localId, input.localId),
            eq(officerAssignments.userId, input.userId),
            eq(officerAssignments.position, position),
            isNull(officerAssignments.revokedAt),
          ),
        )
        .limit(1);
      if (!activeAssignment) {
        await tx.insert(officerAssignments).values({
          id: newId("oa"),
          unionId: input.unionId,
          localId: input.localId,
          userId: input.userId,
          position,
          assignedById: grantorId,
        });
      }
    }
    await tx.execute(
      sql`SELECT app_sync_local_portal_membership(${input.unionId}, ${input.localId}, ${input.userId})`,
    );
  });
}
