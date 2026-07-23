/**
 * Live RLS smoke (SEC-003).
 *
 * Connects as the non-owner app role and verifies cross-union SELECT returns
 * 0 rows when session GUCs are set to another union.
 *
 * Prerequisites:
 *   - Migrations applied (incl. 0008_app_role)
 *   - Reference tenant seeded (`npm run db:seed`)
 *   - DATABASE_URL = postgres://unionops_app:…@…/unionops
 *     (table-owner URLs bypass RLS — this script exits non-zero if so)
 *
 * Run: npm run db:rls-smoke
 */
import postgres from "postgres";
import { APP_DB_ROLE } from "../src/lib/db/rls-contract";

const FIXTURE_ID = "grev-rls-smoke-001";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required (prefer unionops_app credentials)");
  }

  const sql = postgres(url, { max: 1 });

  try {
    const [{ user, bypass }] = await sql<{
      user: string;
      bypass: boolean;
    }[]>`
      select
        current_user as user,
        coalesce(
          (select rolbypassrls from pg_roles where rolname = current_user),
          false
        ) as bypass
    `;

    if (user !== APP_DB_ROLE) {
      throw new Error(
        `Expected current_user=${APP_DB_ROLE}, got ${user}. ` +
          `Point DATABASE_URL at the app role so RLS is not bypassed.`,
      );
    }
    if (bypass) {
      throw new Error(`${APP_DB_ROLE} unexpectedly has BYPASSRLS`);
    }

    // Insert fixture under the reference tenant session.
    await sql`select set_config('app.current_union_id', 'union-opseu', false)`;
    await sql`select set_config('app.current_local_id', 'local-243', false)`;
    await sql`select set_config('app.current_cross_local', 'false', false)`;

    await sql`
      insert into grievances (
        id, union_id, local_id, bargaining_unit_id, member_pseudonym,
        category, status, current_step, filed_at, assigned_steward_id,
        created_by_id, updated_at
      ) values (
        ${FIXTURE_ID}, 'union-opseu', 'local-243', 'bu-243-ft', 'RLS Smoke',
        'rls-smoke', 'open', 1, now(), 'user-rls-smoke',
        'user-rls-smoke', now()
      )
      on conflict (id) do update set
        union_id = excluded.union_id,
        local_id = excluded.local_id,
        updated_at = now()
    `;

    // Cross-union session — must not see the fixture.
    await sql`select set_config('app.current_union_id', 'union-other', false)`;
    await sql`select set_config('app.current_local_id', 'local-other', false)`;

    const cross = await sql<{ id: string }[]>`
      select id from grievances where id = ${FIXTURE_ID}
    `;
    if (cross.length !== 0) {
      throw new Error(
        `RLS failed: cross-union SELECT returned ${cross.length} row(s)`,
      );
    }

    // Matching union — should see it.
    await sql`select set_config('app.current_union_id', 'union-opseu', false)`;
    await sql`select set_config('app.current_local_id', 'local-243', false)`;

    const same = await sql<{ id: string }[]>`
      select id from grievances where id = ${FIXTURE_ID}
    `;
    if (same.length !== 1) {
      throw new Error(
        `RLS failed: same-union SELECT returned ${same.length} row(s), expected 1`,
      );
    }

    await sql`delete from grievances where id = ${FIXTURE_ID}`;
    console.log(
      "[rls-smoke] ok — cross-union SELECT returned 0; same-union returned 1",
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("[rls-smoke] failed:", err);
  process.exitCode = 1;
});
