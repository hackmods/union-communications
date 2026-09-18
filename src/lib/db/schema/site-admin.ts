/**
 * Site Admin / platform-operator schema.
 *
 * Email-change grants (2-token flow) are stored here. Operator issues a grant
 * via `/api/site-admin/users/[id]/change-email` — the new address receives a
 * single-use link that, on consume, swaps `users.email`, increments
 * `users.session_version`, and audits `site_admin.user.email_change_confirmed`.
 * No tenant RLS on this table: the public confirmation route reads by token
 * without GUCs (same posture as `password_reset_tokens` / `sign_in_tokens`).
 *
 * Companion DDL lives in `src/lib/db/migrations/0035_site_admin.sql`.
 */
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const emailChangeTokens = pgTable(
  "email_change_tokens",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull(),
    /** Normalized lowercase CURRENT email of the user (for lookup / revocation). */
    email: text("email").notNull(),
    userId: text("user_id").notNull(),
    /** New email address — the one the grant link points to. */
    newEmail: text("new_email").notNull(),
    /** Platform-admin actor who issued the change. */
    invitedById: text("invited_by_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("email_change_tokens_token_idx").on(t.token),
    index("email_change_tokens_email_idx").on(t.email),
    index("email_change_tokens_user_id_idx").on(t.userId),
  ],
);
