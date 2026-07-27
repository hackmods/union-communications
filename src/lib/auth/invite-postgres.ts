import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/types/tenant";
import { hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db/client";
import { userInvites } from "@/lib/db/schema/auth";
import { users } from "@/lib/db/schema/tenant";

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
  unionId: string;
  localId?: string;
  divisionId?: string;
  bargainingUnitId?: string;
  roles: UserRole[];
  /** When set, update this user id instead of upserting by email. */
  userId?: string;
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
    unionId: input.unionId,
    localId: input.localId ?? null,
    divisionId: input.divisionId ?? null,
    bargainingUnitId: input.bargainingUnitId ?? null,
    roles: input.roles,
    mfaEnabled: false,
  };

  if (input.userId) {
    await db
      .update(users)
      .set(values)
      .where(eq(users.id, input.userId));
    return { id: input.userId, created: false };
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

  const { id: userId } = await upsertPostgresUser({
    email: invite.email,
    name: invite.name,
    password,
    unionId: invite.unionId,
    localId: invite.localId,
    divisionId: invite.divisionId,
    bargainingUnitId: invite.bargainingUnitId,
    roles: invite.roles,
  });

  const db = getDb();
  await db
    .update(userInvites)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
    })
    .where(eq(userInvites.id, invite.id));

  return { userId };
}
