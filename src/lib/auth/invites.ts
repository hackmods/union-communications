import { randomBytes } from "crypto";
import type { UserRole } from "@/types/tenant";
import { hashPassword } from "@/lib/auth/password";

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

/** Accepted invitees before Postgres users are the sole auth source. */
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

export function createInvite(input: {
  email: string;
  name: string;
  unionId: string;
  localId?: string;
  divisionId?: string;
  bargainingUnitId?: string;
  roles: UserRole[];
  invitedById: string;
  /** Hours until expiry; default 72. */
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

export function getInviteByToken(token: string): InviteRecord | null {
  return invites.find((i) => i.token === token) ?? null;
}

export async function acceptInvite(
  token: string,
  password: string,
): Promise<{ user?: InvitedUserRecord; error?: string }> {
  const invite = getInviteByToken(token);
  if (!invite) return { error: "Invite not found" };
  if (invite.status !== "pending") return { error: "Invite is no longer pending" };
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    invite.status = "expired";
    return { error: "Invite expired" };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters" };

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
  return { user };
}

export async function findInvitedUser(
  email: string,
  password: string,
): Promise<InvitedUserRecord | null> {
  const { verifyPassword } = await import("@/lib/auth/password");
  const user = invitedUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

/** @internal test helper */
export function resetInviteStoreForTests(): void {
  invites.length = 0;
  invitedUsers.length = 0;
}
