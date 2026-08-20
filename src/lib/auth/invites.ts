import { randomBytes } from "crypto";
import type { UserRole } from "@/types/tenant";
import { getLocalById } from "@/lib/tenant/loader";
import { hydrateTenantOverlayFromPostgres } from "@/lib/tenant/persist";
import { portalStore } from "@/lib/portal/memory-adapter";
import { hashPassword } from "@/lib/auth/password";
import {
  acceptInvitePostgres,
  createInvitePostgres,
  getInviteByTokenPostgres,
  invitesPostgresEnabled,
  listInvitesPostgres,
} from "@/lib/auth/invite-postgres";

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export type InviteRecord = {
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
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
};

/** Accepted invitees when AUTH_USERS_BACKEND=memory (legacy demo path). */
export type InvitedUserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  unionId: string;
  localId?: string;
  divisionId?: string;
  bargainingUnitId?: string;
  roles: UserRole[];
  requiresMfa: boolean;
  createdAt: string;
};

const invites: InviteRecord[] = [];
const invitedUsers: InvitedUserRecord[] = [];

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function createInviteMemory(input: {
  email: string;
  name: string;
  unionId: string;
  localId?: string;
  divisionId?: string;
  bargainingUnitId?: string;
  roles: UserRole[];
  invitedById: string;
  ttlHours?: number;
}): InviteRecord {
  const now = Date.now();
  const ttl = (input.ttlHours ?? 72) * 60 * 60 * 1000;
  const row: InviteRecord = {
    id: id("inv"),
    token: randomBytes(24).toString("base64url"),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    unionId: input.unionId,
    localId: input.localId,
    divisionId: input.divisionId,
    bargainingUnitId: input.bargainingUnitId,
    roles: input.roles,
    invitedById: input.invitedById,
    status: "pending",
    expiresAt: new Date(now + ttl).toISOString(),
    createdAt: new Date(now).toISOString(),
  };
  invites.push(row);
  return row;
}

export async function createInvite(input: {
  email: string;
  name: string;
  unionId: string;
  localId?: string;
  divisionId?: string;
  bargainingUnitId?: string;
  roles: UserRole[];
  invitedById: string;
  ttlHours?: number;
}): Promise<InviteRecord> {
  if (invitesPostgresEnabled()) {
    return createInvitePostgres(input);
  }
  return createInviteMemory(input);
}

export async function getInviteByToken(
  token: string,
): Promise<InviteRecord | null> {
  if (invitesPostgresEnabled()) {
    return getInviteByTokenPostgres(token);
  }
  return invites.find((i) => i.token === token) ?? null;
}

function withListExpiry(row: InviteRecord): InviteRecord {
  if (
    row.status === "pending" &&
    new Date(row.expiresAt).getTime() < Date.now()
  ) {
    return { ...row, status: "expired" };
  }
  return row;
}

export async function listInvitesForUnion(input: {
  unionId: string;
  localId?: string;
}): Promise<InviteRecord[]> {
  const rows = invitesPostgresEnabled()
    ? await listInvitesPostgres(input)
    : invites.filter(
        (row) =>
          row.unionId === input.unionId &&
          (!input.localId || row.localId === input.localId),
      );
  return rows.map(withListExpiry);
}

function joinHallForInvitee(input: {
  userId: string;
  userName: string;
  unionId: string;
  localId?: string;
  roles: UserRole[];
}): void {
  if (!input.localId) return;
  const local = getLocalById(input.unionId, input.localId);
  const hallAdmin = input.roles.some((r) =>
    [
      "local_president",
      "local_exec",
      "union_admin",
      "division_admin",
      "platform_admin",
    ].includes(r),
  );
  portalStore.ensureHallAndJoin({
    unionId: input.unionId,
    localId: input.localId,
    localNumber: local?.localNumber,
    userId: input.userId,
    userName: input.userName,
    admin: hallAdmin,
  });
}

async function acceptInviteMemory(
  token: string,
  password: string,
): Promise<{ user?: InvitedUserRecord; error?: string }> {
  const invite = invites.find((i) => i.token === token);
  if (!invite) return { error: "Invite not found" };
  if (invite.status !== "pending") {
    return { error: "Invite is no longer pending" };
  }
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    invite.status = "expired";
    return { error: "Invite expired" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const passwordHash = await hashPassword(password);
  const user: InvitedUserRecord = {
    id: id("user"),
    email: invite.email,
    name: invite.name,
    passwordHash,
    unionId: invite.unionId,
    localId: invite.localId,
    divisionId: invite.divisionId,
    bargainingUnitId: invite.bargainingUnitId,
    roles: invite.roles,
    requiresMfa: true,
    createdAt: new Date().toISOString(),
  };
  invitedUsers.push(user);
  invite.status = "accepted";
  invite.acceptedAt = user.createdAt;
  joinHallForInvitee({
    userId: user.id,
    userName: user.name,
    unionId: user.unionId,
    localId: user.localId,
    roles: user.roles,
  });
  return { user };
}

export async function acceptInvite(
  token: string,
  password: string,
): Promise<{ user?: InvitedUserRecord; error?: string }> {
  await hydrateTenantOverlayFromPostgres();
  if (invitesPostgresEnabled()) {
    const result = await acceptInvitePostgres(token, password);
    if (result.error || !result.userId) {
      return { error: result.error ?? "Accept failed" };
    }
    const invite = await getInviteByTokenPostgres(token);
    if (!invite) return { error: "Invite not found" };
    joinHallForInvitee({
      userId: result.userId,
      userName: invite.name,
      unionId: invite.unionId,
      localId: invite.localId,
      roles: invite.roles,
    });
    return {
      user: {
        id: result.userId,
        email: invite.email,
        name: invite.name,
        passwordHash: "",
        unionId: invite.unionId,
        localId: invite.localId,
        divisionId: invite.divisionId,
        bargainingUnitId: invite.bargainingUnitId,
        roles: invite.roles,
        requiresMfa: true,
        createdAt: invite.acceptedAt ?? new Date().toISOString(),
      },
    };
  }
  return acceptInviteMemory(token, password);
}

export async function findInvitedUser(
  email: string,
  password: string,
): Promise<InvitedUserRecord | null> {
  const { verifyPassword } = await import("@/lib/auth/password");
  const user = findInvitedUserRecordByEmail(email);
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

/** Lookup without password check (password-reset forgot flow). */
export function findInvitedUserRecordByEmail(
  email: string,
): InvitedUserRecord | null {
  return (
    invitedUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ??
    null
  );
}

export function findInvitedUserRecordById(
  userId: string,
): InvitedUserRecord | null {
  return invitedUsers.find((u) => u.id === userId) ?? null;
}

/** In-process accepted invitees for Hall roster rebuild (memory auth). */
export function listInvitedUsersForLocal(
  unionId: string,
  localId: string,
): InvitedUserRecord[] {
  return invitedUsers.filter(
    (user) => user.unionId === unionId && user.localId === localId,
  );
}

/** Update password hash for an accepted invitee (memory auth). */
export function updateInvitedUserPasswordHash(
  email: string,
  passwordHash: string,
): boolean {
  const user = findInvitedUserRecordByEmail(email);
  if (!user) return false;
  user.passwordHash = passwordHash;
  return true;
}

/** @internal test helper */
export function resetInviteStoreForTests(): void {
  invites.length = 0;
  invitedUsers.length = 0;
}
