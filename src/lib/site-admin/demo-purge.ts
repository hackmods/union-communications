/**
 * Demo roster purge — counts and deletes rows flagged `is_demo = true`.
 *
 * Preview (site-admin UI + CLI dry-run) uses the runtime `DATABASE_URL`.
 * Destructive delete uses the owner role (`MIGRATE_DATABASE_URL`) so RLS does
 * not hide casework under demo unions.
 *
 * Confirmation phrase is exact: `DELETE demo` (see DEMO_PURGE_CONFIRM_PHRASE).
 */
import { eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import {
  users,
  unions,
  divisions,
  locals,
} from "@/lib/db/schema/tenant";
import {
  passwordResetTokens,
  signInTokens,
} from "@/lib/db/schema/auth";
import { emailChangeTokens } from "@/lib/db/schema/site-admin";

/** Exact phrase operators must type (CLI + UI). */
export const DEMO_PURGE_CONFIRM_PHRASE = "DELETE demo";

export type DemoPurgeCounts = {
  users: number;
  unions: number;
  divisions: number;
  locals: number;
};

export type DemoPurgeResult = {
  countsBefore: DemoPurgeCounts;
  deleted: DemoPurgeCounts;
  caseworkStatements: number;
};

/**
 * Union-scoped casework tables, children before parents where both carry
 * `union_id` with `ON DELETE RESTRICT` against `unions` / `locals`.
 * Tables that only cascade from a parent (e.g. `rsvp_tokens`) are omitted —
 * deleting the parent is enough.
 */
export const DEMO_PURGE_UNION_SCOPED_TABLES: readonly string[] = [
  // Meetings / RSVP (responses before meetings; tokens cascade from meetings)
  "rsvp_responses",
  "union_meetings",
  "local_meeting_schedules",
  // Check-ins
  "checkin_answers",
  "checkin_schedules",
  // Polls
  "poll_responses",
  "poll_definitions",
  // Travel / expenses
  "expense_claims",
  "cash_advances",
  "travel_authorizations",
  "expense_submissions",
  // Org modules
  "election_cycles",
  "committees",
  "meeting_minutes",
  "ledger_entries",
  "officer_roster",
  "officer_learning_users",
  "officer_learning_local_settings",
  "informal_log_entries",
  "tasks",
  // Discussions (posts before threads — both restrict on unions)
  "discussion_posts",
  "discussion_threads",
  // Files
  "documents",
  "attachment_meta",
  // Time
  "time_entries",
  "pto_requests",
  "pto_balances",
  "time_shifts",
  "time_shift_series",
  "time_expected_windows",
  "time_workers",
  "time_worker_groups",
  "time_ot_policies",
  "pto_accrual_policies",
  "payroll_export_profiles",
  "job_codes",
  "work_sites",
  // QOL + casework (child grievance/bumping rows cascade from parents)
  "member_communications",
  "scheduled_meetings",
  "grievances",
  "bumping_cases",
  "member_seniority_records",
] as const;

export function assertDemoPurgeConfirm(phrase: string): void {
  if (phrase !== DEMO_PURGE_CONFIRM_PHRASE) {
    throw new Error(
      `Confirmation phrase mismatch — type exactly "${DEMO_PURGE_CONFIRM_PHRASE}"`,
    );
  }
}

export function totalDemoCount(counts: DemoPurgeCounts): number {
  return counts.users + counts.unions + counts.divisions + counts.locals;
}

export async function countDemoRows(db: Db): Promise<DemoPurgeCounts> {
  const [u] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.isDemo, true));
  const [n] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(unions)
    .where(eq(unions.isDemo, true));
  const [d] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(divisions)
    .where(eq(divisions.isDemo, true));
  const [l] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(locals)
    .where(eq(locals.isDemo, true));
  return {
    users: u?.n ?? 0,
    unions: n?.n ?? 0,
    divisions: d?.n ?? 0,
    locals: l?.n ?? 0,
  };
}

/**
 * Destructive purge. Caller must already have validated the confirm phrase
 * and (for UI) re-authenticated the actor. Prefer `getOwnerDb()` so RLS cannot
 * leave orphan restrict FKs.
 */
export async function purgeDemoRows(
  db: Db,
  opts: { actorUserId?: string; now?: Date } = {},
): Promise<DemoPurgeResult> {
  const now = opts.now ?? new Date();
  const countsBefore = await countDemoRows(db);
  if (totalDemoCount(countsBefore) === 0) {
    return { countsBefore, deleted: countsBefore, caseworkStatements: 0 };
  }

  const demoUserIds = (
    await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isDemo, true))
  ).map((r) => r.id);

  if (
    opts.actorUserId &&
    demoUserIds.includes(opts.actorUserId)
  ) {
    throw new Error(
      "Refusing to purge: the acting operator account is flagged is_demo",
    );
  }

  let caseworkStatements = 0;

  await db.transaction(async (tx) => {
    for (const table of DEMO_PURGE_UNION_SCOPED_TABLES) {
      // Table names are a fixed allowlist — never interpolate operator input.
      await tx.execute(
        sql.raw(
          `DELETE FROM "${table}" WHERE union_id IN (SELECT id FROM unions WHERE is_demo = true)`,
        ),
      );
      caseworkStatements += 1;
    }

    await tx.execute(
      sql.raw(
        `DELETE FROM user_invites WHERE union_id IN (SELECT id FROM unions WHERE is_demo = true)`,
      ),
    );
    caseworkStatements += 1;

    if (demoUserIds.length > 0) {
      await tx
        .delete(passwordResetTokens)
        .where(inArray(passwordResetTokens.userId, demoUserIds));
      await tx
        .delete(signInTokens)
        .where(inArray(signInTokens.userId, demoUserIds));
      await tx
        .delete(emailChangeTokens)
        .where(inArray(emailChangeTokens.userId, demoUserIds));

      // Archive-first, then hard-delete (site-admin hard-delete contract).
      await tx
        .update(users)
        .set({
          archivedAt: now,
          archivedById: opts.actorUserId ?? null,
        })
        .where(eq(users.isDemo, true));

      await tx.delete(users).where(eq(users.isDemo, true));
    }

    await tx.delete(locals).where(eq(locals.isDemo, true));
    await tx.delete(divisions).where(eq(divisions.isDemo, true));
    await tx.delete(unions).where(eq(unions.isDemo, true));
  });

  return {
    countsBefore,
    deleted: countsBefore,
    caseworkStatements,
  };
}

/** Format counts the same way the site-admin preview UI does. */
export function formatDemoPurgeCounts(counts: DemoPurgeCounts): string {
  return [
    `users=${counts.users}`,
    `unions=${counts.unions}`,
    `divisions=${counts.divisions}`,
    `locals=${counts.locals}`,
    `total=${totalDemoCount(counts)}`,
  ].join(" ");
}
