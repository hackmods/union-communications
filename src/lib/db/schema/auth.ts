import {
  check,
  integer,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { bargainingUnits, divisions, locals, unions, users } from "./tenant";

/** Latest consumed RFC 6238 counter per account, used to reject OTP replay. */
export const mfaTotpCounters = pgTable("mfa_totp_counters", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  lastCounter: integer("last_counter").notNull(),
});

/** Latest single-use session-update grant per account; the token itself is never stored. */
export const mfaSessionGrants = pgTable("mfa_session_grants", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  sessionVersion: integer("session_version").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

/** Short-window cap for MFA challenges, shared by hosted app replicas. */
export const mfaVerificationAttempts = pgTable(
  "mfa_verification_attempts",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    attemptCount: integer("attempt_count").notNull(),
  },
  (t) => [
    check(
      "mfa_verification_attempts_count_check",
      sql`${t.attemptCount} between 1 and 10`,
    ),
  ],
);

/** Hashed one-time MFA recovery credentials; plaintext is returned once only. */
export const mfaRecoveryCodes = pgTable(
  "mfa_recovery_codes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("mfa_recovery_codes_user_hash_idx").on(t.userId, t.codeHash),
    index("mfa_recovery_codes_user_used_idx").on(t.userId, t.usedAt),
  ],
);

/**
 * Password-reset tokens — opaque public capability (like RSVP tokens).
 * No tenant RLS: public forgot/reset routes look up by token without GUCs
 * (same as `users`). Optional for invitee resets when AUTH_USERS_BACKEND=postgres.
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    /** Normalized lowercase email */
    email: text("email").notNull(),
    /** Account id (Postgres user or memory invitee) — no FK so invitees work */
    userId: text("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("password_reset_tokens_token_idx").on(t.token),
    index("password_reset_tokens_email_idx").on(t.email),
  ],
);

/**
 * Officer Hub invites — durable when AUTH_USERS_BACKEND=postgres.
 * No tenant RLS: public accept route looks up by token without GUCs.
 */
export const userInvites = pgTable(
  "user_invites",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id").references(() => locals.id, {
      onDelete: "set null",
    }),
    divisionId: text("division_id").references(() => divisions.id, {
      onDelete: "set null",
    }),
    bargainingUnitId: text("bargaining_unit_id").references(
      () => bargainingUnits.id,
      { onDelete: "set null" },
    ),
    roles: jsonb("roles").notNull().$type<string[]>(),
    invitedById: text("invited_by_id").notNull(),
    status: text("status")
      .notNull()
      .$type<"pending" | "accepted" | "revoked" | "expired">(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("user_invites_token_idx").on(t.token),
    index("user_invites_union_id_idx").on(t.unionId),
    index("user_invites_email_idx").on(t.email),
  ],
);

/**
 * Magic sign-in link tokens — opaque public capability (like password-reset).
 * No tenant RLS: public verify route looks up by token without GUCs.
 */
export const signInTokens = pgTable(
  "sign_in_tokens",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    email: text("email").notNull(),
    userId: text("user_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("sign_in_tokens_token_idx").on(t.token),
    index("sign_in_tokens_email_idx").on(t.email),
  ],
);
