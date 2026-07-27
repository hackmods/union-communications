import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { bargainingUnits, divisions, locals, unions } from "./tenant";

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
