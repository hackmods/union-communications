/**
 * Live RLS smoke (SEC-003) against the non-owner application role.
 *
 * Requires migrations through the current tail, seeded Local 7 demo membership,
 * and DATABASE_URL=postgres://unionops_app:... (not the table owner).
 * Run: npm run db:rls-smoke
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { APP_DB_ROLE } from "../src/lib/db/rls-contract";

const UNION = "union-b7p";
const LOCAL = "local-7";
const PRESIDENT = "user-president-7";
const LOCAL_MEMBER = "user-member-7";
const OTHER_LOCAL_MEMBER = "user-president-1337";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required (use unionops_app credentials)");

  const sql = postgres(url, { max: 1 });
  const fixtureId = `grev-rls-smoke-${randomUUID()}`;
  const committeeId = `com-rls-smoke-${randomUUID()}`;
  const committeeMembershipId = `cm-rls-smoke-${randomUUID()}`;
  try {
    const [{ user, bypass }] = await sql<{ user: string; bypass: boolean }[]>`
      select current_user as user,
        coalesce((select rolbypassrls from pg_roles where rolname = current_user), false) as bypass
    `;
    if (user !== APP_DB_ROLE) throw new Error(`Expected current_user=${APP_DB_ROLE}, got ${user}`);
    if (bypass) throw new Error(`${APP_DB_ROLE} unexpectedly has BYPASSRLS`);

    await sql`select set_config('app.current_union_id', ${UNION}, false)`;
    await sql`select set_config('app.current_local_id', ${LOCAL}, false)`;
    await sql`select set_config('app.current_user_id', ${PRESIDENT}, false)`;
    await sql`select set_config('app.current_cross_local', 'false', false)`;
    await sql`select set_config('app.current_mfa_verified', 'true', false)`;
    await sql`
      insert into committees (id, union_id, local_id, name, member_officer_ids)
      values (${committeeId}, ${UNION}, ${LOCAL}, 'RLS Smoke Committee', '[]'::jsonb)
    `;
    await sql`
      insert into committee_memberships (id, committee_id, union_id, local_id, user_id)
      values (${committeeMembershipId}, ${committeeId}, ${UNION}, ${LOCAL}, ${LOCAL_MEMBER})
    `;
    const linked = await sql<{ user_id: string }[]>`
      select user_id from committee_memberships where id = ${committeeMembershipId}
    `;
    if (linked.length !== 1 || linked[0].user_id !== LOCAL_MEMBER) {
      throw new Error("Committee RLS failed: active same-local membership was not linked");
    }

    let wrongLocalRejected = false;
    try {
      await sql`
        insert into committee_memberships (id, committee_id, union_id, local_id, user_id)
        values (${`cm-wrong-local-${randomUUID()}`}, ${committeeId}, ${UNION}, ${LOCAL}, ${OTHER_LOCAL_MEMBER})
      `;
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "42501")) {
        throw error;
      }
      wrongLocalRejected = true;
    }
    if (!wrongLocalRejected) {
      throw new Error("Committee RLS failed: a different-local account was linked");
    }

    await sql`
      insert into grievances (
        id, union_id, local_id, bargaining_unit_id, member_pseudonym,
        category, status, current_step, filed_at, assigned_steward_id,
        created_by_id, updated_at
      ) values (
        ${fixtureId}, ${UNION}, ${LOCAL}, 'bu-7-ft', 'RLS Smoke',
        'rls-smoke', 'open', 1, now(), 'user-steward-7', ${PRESIDENT}, now()
      )
    `;

    await sql`select set_config('app.current_union_id', 'union-other', false)`;
    await sql`select set_config('app.current_local_id', 'local-other', false)`;
    const crossUnion = await sql<{ id: string }[]>`select id from grievances where id = ${fixtureId}`;
    if (crossUnion.length !== 0) throw new Error("RLS failed: cross-union grievance read succeeded");

    await sql`select set_config('app.current_union_id', ${UNION}, false)`;
    await sql`select set_config('app.current_local_id', '', false)`;
    const missingLocal = await sql<{ id: string }[]>`select id from grievances where id = ${fixtureId}`;
    if (missingLocal.length !== 0) throw new Error("RLS failed: missing local scope expanded grievance access");
    const committeeMissingLocal = await sql<{ id: string }[]>`select id from committees where id = ${committeeId}`;
    if (committeeMissingLocal.length !== 0) throw new Error("Committee RLS failed: missing local scope exposed a committee");

    await sql`select set_config('app.current_local_id', 'local-404', false)`;
    const wrongLocal = await sql<{ id: string }[]>`select id from grievances where id = ${fixtureId}`;
    if (wrongLocal.length !== 0) throw new Error("RLS failed: wrong local scope read a grievance");

    await sql`select set_config('app.current_local_id', ${LOCAL}, false)`;
    const sameScope = await sql<{ id: string }[]>`select id from grievances where id = ${fixtureId}`;
    if (sameScope.length !== 1) throw new Error(`RLS failed: matching officer scope returned ${sameScope.length} rows`);

    await sql`delete from committees where id = ${committeeId}`;
    await sql`delete from grievances where id = ${fixtureId}`;
    console.log("[rls-smoke] ok — app role, grievance scope, committee active-local link, wrong-local denial, and missing-local denial passed");
  } finally {
    await sql`select set_config('app.current_union_id', ${UNION}, false)`;
    await sql`select set_config('app.current_local_id', ${LOCAL}, false)`;
    await sql`select set_config('app.current_user_id', ${PRESIDENT}, false)`;
    await sql`delete from committees where id = ${committeeId}`;
    await sql`delete from grievances where id = ${fixtureId}`;
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("[rls-smoke] failed:", error);
  process.exitCode = 1;
});
