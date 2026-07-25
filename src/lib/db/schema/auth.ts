import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
