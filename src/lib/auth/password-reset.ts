/**
 * Password-reset tokens (memory). Mirrors invite token pattern.
 * Durable Postgres token table is a follow-up when AUTH_USERS_BACKEND=postgres
 * needs restart-safe resets.
 */

import { randomBytes } from "crypto";

export type PasswordResetToken = {
  id: string;
  token: string;
  /** Normalized lowercase email */
  email: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  consumedAt?: string;
};

const tokens: PasswordResetToken[] = [];

const DEFAULT_TTL_HOURS = 2;

function id(): string {
  return `pwr-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

export function createPasswordResetToken(input: {
  email: string;
  userId: string;
  ttlHours?: number;
}): PasswordResetToken {
  const now = Date.now();
  const ttl = (input.ttlHours ?? DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
  // Invalidate prior unused tokens for this email.
  for (const row of tokens) {
    if (
      row.email === input.email.trim().toLowerCase() &&
      !row.consumedAt
    ) {
      row.consumedAt = new Date(now).toISOString();
    }
  }
  const row: PasswordResetToken = {
    id: id(),
    token: randomBytes(24).toString("base64url"),
    email: input.email.trim().toLowerCase(),
    userId: input.userId,
    expiresAt: new Date(now + ttl).toISOString(),
    createdAt: new Date(now).toISOString(),
  };
  tokens.push(row);
  return row;
}

export function getPasswordResetToken(
  token: string,
): PasswordResetToken | null {
  return tokens.find((t) => t.token === token) ?? null;
}

export type ConsumePasswordResetResult =
  | { ok: true; row: PasswordResetToken }
  | { ok: false; error: "not_found" | "expired" | "consumed" };

export function consumePasswordResetToken(
  token: string,
): ConsumePasswordResetResult {
  const row = getPasswordResetToken(token);
  if (!row) return { ok: false, error: "not_found" };
  if (row.consumedAt) return { ok: false, error: "consumed" };
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    row.consumedAt = new Date().toISOString();
    return { ok: false, error: "expired" };
  }
  row.consumedAt = new Date().toISOString();
  return { ok: true, row };
}

/** @internal test helper */
export function resetPasswordResetStoreForTests(): void {
  tokens.length = 0;
}
