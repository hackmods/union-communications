/**
 * Upgrade acceptance fixture for the Members Portal migrations.
 *
 * Requires an empty, disposable Postgres database. MIGRATE_DATABASE_URL must
 * be its migration owner; DATABASE_URL must be unionops_app for the same DB.
 * The script applies the immutable journal through 0039, inserts representative
 * legacy rows, runs the current boot deploy gate, then checks compatibility
 * backfills and preserved records. It never creates or drops a database.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const legacyTail = "0039_hub_bylaws_proposals";
const prefix = "upgrade_fixture_";

type JournalEntry = { idx: number; when: number; tag: string; breakpoints: boolean };
type Journal = { version: string; dialect: string; entries: JournalEntry[] };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function migrationUrl(): string {
  const value = process.env.MIGRATE_DATABASE_URL?.trim();
  if (!value) throw new Error("MIGRATE_DATABASE_URL must target an empty disposable upgrade database");
  return value;
}

function runtimeUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL must use the restricted unionops_app role");
  return value;
}

async function insertLegacyFixture(sql: postgres.Sql): Promise<void> {
  await sql`
    INSERT INTO unions (id,name,slug,enabled_modules)
    VALUES (${`${prefix}union`},'Upgrade Fixture Union',${`${prefix}union`},'["grievance"]'::jsonb)
  `;
  await sql`
    INSERT INTO locals (id,union_id,local_number) VALUES
      (${`${prefix}local`},${`${prefix}union`},'U1'),
      (${`${prefix}local_secondary`},${`${prefix}union`},'U2')
  `;
  await sql`
    INSERT INTO unions (id,name,slug,enabled_modules)
    VALUES (${`${prefix}other_union`},'Other Upgrade Union',${`${prefix}other_union`},'[]'::jsonb)
  `;
  await sql`
    INSERT INTO locals (id,union_id,local_number)
    VALUES (${`${prefix}other_local`},${`${prefix}other_union`},'OX')
  `;
  await sql`
    INSERT INTO bargaining_units (id,union_id,local_id,code,name)
    VALUES (${`${prefix}bu`},${`${prefix}union`},${`${prefix}local`},'FT','Full time')
  `;
  await sql`
    INSERT INTO users (id,email,name,password_hash,union_id,local_id,bargaining_unit_id,accessible_local_ids,roles) VALUES
      (${`${prefix}president`},'president@upgrade.invalid','Upgrade President','fixture',${`${prefix}union`},${`${prefix}local`},${`${prefix}bu`},'[]'::jsonb,'["local_president"]'::jsonb),
      (${`${prefix}steward`},'steward@upgrade.invalid','Upgrade Steward','fixture',${`${prefix}union`},${`${prefix}local`},${`${prefix}bu`},'[]'::jsonb,'["local_steward"]'::jsonb),
      (${`${prefix}executive`},'exec@upgrade.invalid','Upgrade Executive','fixture',${`${prefix}union`},${`${prefix}local`},${`${prefix}bu`},'[]'::jsonb,'["local_exec"]'::jsonb),
      (${`${prefix}administrator`},'admin@upgrade.invalid','Upgrade Administrator','fixture',${`${prefix}union`},${`${prefix}local`},${`${prefix}bu`},${JSON.stringify([`${prefix}local_secondary`])}::jsonb,'["union_admin"]'::jsonb),
      (${`${prefix}member`},'member@upgrade.invalid','Upgrade Member','fixture',${`${prefix}union`},${`${prefix}local`},${`${prefix}bu`},'[]'::jsonb,'["solo_account"]'::jsonb),
      (${`${prefix}multi_local_member`},'multi-local@upgrade.invalid','Multi-local Member','fixture',${`${prefix}union`},${`${prefix}local`},${`${prefix}bu`},${JSON.stringify([`${prefix}local_secondary`])}::jsonb,'["solo_account"]'::jsonb),
      (${`${prefix}foreign_user`},'cross-link@upgrade.invalid','Other Union User','fixture',${`${prefix}other_union`},${`${prefix}other_local`},NULL,'[]'::jsonb,'["local_steward"]'::jsonb)
  `;
  await sql`
    INSERT INTO officer_roster (id,union_id,local_id,name,role,term_start,email) VALUES
      (${`${prefix}roster_president`},${`${prefix}union`},${`${prefix}local`},'Upgrade President','Local President','2025-01-01','president@upgrade.invalid'),
      (${`${prefix}roster_steward`},${`${prefix}union`},${`${prefix}local`},'Upgrade Steward','Chief Steward','2025-01-01','steward@upgrade.invalid'),
      (${`${prefix}roster_cross_union`},${`${prefix}union`},${`${prefix}local`},'Other Union User','Steward','2025-01-01','cross-link@upgrade.invalid')
  `;
  await sql`
    INSERT INTO committees (id,union_id,local_id,name,member_officer_ids)
    VALUES (${`${prefix}committee`},${`${prefix}union`},${`${prefix}local`},'Upgrade Committee',${JSON.stringify([`${prefix}roster_steward`, `${prefix}roster_unresolved`])}::jsonb)
  `;
  await sql`
    INSERT INTO grievances (id,union_id,local_id,bargaining_unit_id,member_pseudonym,category,status,current_step,filed_at,assigned_steward_id,created_by_id)
    VALUES (${`${prefix}grievance`},${`${prefix}union`},${`${prefix}local`},${`${prefix}bu`},'Legacy Member','hours','open',1,now(),${`${prefix}steward`},${`${prefix}president`})
  `;
  await sql`
    INSERT INTO attachment_meta (id,union_id,local_id,bargaining_unit_id,grievance_id,file_name,mime_type,size_bytes,storage_key,scan_status,uploaded_by_id)
    VALUES (${`${prefix}attachment`},${`${prefix}union`},${`${prefix}local`},${`${prefix}bu`},${`${prefix}grievance`},'legacy.pdf','application/pdf',123,'legacy/upgrade.pdf','clean',${`${prefix}steward`})
  `;
}

async function verifyBackfill(owner: postgres.Sql, runtime: postgres.Sql, dataWorkBenchWhen: number): Promise<void> {
  const presidentMemberships = await owner`
    SELECT local_id FROM local_memberships
    WHERE user_id=${`${prefix}president`} AND status='active'
  `;
  assert(presidentMemberships.length === 1 && presidentMemberships[0].local_id === `${prefix}local`, "primary membership backfill failed");
  const adminExtraMembership = await owner`
    SELECT id FROM local_memberships WHERE user_id=${`${prefix}administrator`} AND local_id=${`${prefix}local_secondary`}
  `;
  assert(adminExtraMembership.length === 0, "administrator-wide switch scope was backfilled as membership");
  const extraMemberMembership = await owner`
    SELECT id FROM local_memberships WHERE user_id=${`${prefix}multi_local_member`} AND local_id=${`${prefix}local_secondary`} AND status='active'
  `;
  assert(extraMemberMembership.length === 1, "non-administrative accessible local was not backfilled as membership");

  const officePositions = await owner`
    SELECT position FROM officer_assignments WHERE user_id IN (${`${prefix}president`},${`${prefix}steward`},${`${prefix}executive`})
  `;
  const positions = officePositions.map((row) => row.position).sort().join(",");
  assert(positions === "executive_member,president,steward", "legacy office roles were not backfilled");

  const stewardRoster = await owner`
    SELECT user_id,canonical_position FROM officer_roster WHERE id=${`${prefix}roster_steward`}
  `;
  assert(stewardRoster[0]?.user_id === `${prefix}steward` && stewardRoster[0]?.canonical_position === "steward", "same-union roster account link failed");
  const crossUnionRoster = await owner`
    SELECT user_id FROM officer_roster WHERE id=${`${prefix}roster_cross_union`}
  `;
  assert(crossUnionRoster[0]?.user_id === null, "cross-union roster link was backfilled");

  const committeeMembers = await owner`
    SELECT user_id FROM committee_memberships WHERE committee_id=${`${prefix}committee`}
  `;
  assert(committeeMembers.length === 1 && committeeMembers[0].user_id === `${prefix}steward`, "committee legacy relationship did not backfill only the resolvable local account");
  const grievance = await owner`
    SELECT privacy_mode,member_user_id,assigned_steward_id FROM grievances WHERE id=${`${prefix}grievance`}
  `;
  assert(grievance[0]?.privacy_mode === "standard" && grievance[0]?.member_user_id === null, "legacy grievance privacy/member defaults changed");
  assert(grievance[0]?.assigned_steward_id === `${prefix}steward`, "legacy assigned-steward field was not preserved");
  const participant = await owner`
    SELECT relationship,access_level FROM grievance_participants
    WHERE grievance_id=${`${prefix}grievance`} AND user_id=${`${prefix}steward`} AND revoked_at IS NULL
  `;
  assert(participant[0]?.relationship === "case_worker" && participant[0]?.access_level === "case_write", "legacy assigned steward was not added to case participants");
  const attachment = await owner`SELECT id FROM attachment_meta WHERE id=${`${prefix}attachment`} AND grievance_id=${`${prefix}grievance`}`;
  assert(attachment.length === 1, "legacy attachment metadata was not preserved");
  const committee = await owner`SELECT member_officer_ids FROM committees WHERE id=${`${prefix}committee`}`;
  assert(committee[0]?.member_officer_ids.length === 2, "legacy committee display references were not preserved");
  assert(await owner`SELECT to_regclass('public.data_datasets') AS relation`.then((rows) => rows[0]?.relation) !== null, "upstream Data Workbench migration was not applied");
  const workbenchEntry = await owner`SELECT created_at FROM drizzle.__drizzle_migrations WHERE created_at=${dataWorkBenchWhen}`;
  assert(workbenchEntry.length === 1, "upstream Data Workbench journal entry is missing");

  const [{ currentUser, bypass, ownsTables }] = await runtime`
    SELECT current_user AS "currentUser",
      coalesce((SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user),false) AS bypass,
      EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_roles r ON r.oid=c.relowner
        WHERE c.relkind IN ('r','p') AND c.relnamespace='public'::regnamespace AND r.rolname=current_user
      ) AS "ownsTables"
  `;
  assert(currentUser === "unionops_app" && !bypass, "upgrade verification did not use restricted unionops_app");
  assert(!ownsTables, "runtime application role unexpectedly has owner membership");
}

async function main(): Promise<void> {
  const ownerUrl = migrationUrl();
  const appUrl = runtimeUrl();
  const owner = postgres(ownerUrl, { max: 1 });
  const runtime = postgres(appUrl, { max: 1 });
  const tempMigrations = mkdtempSync(path.join(tmpdir(), "unionops-portal-upgrade-"));

  try {
    const [ownerDb] = await owner`SELECT current_database() AS name`;
    const [runtimeDb] = await runtime`SELECT current_database() AS name, current_user AS role`;
    assert(ownerDb?.name && ownerDb.name === runtimeDb?.name, "owner and runtime URLs must target the same dedicated database");
    assert(runtimeDb?.role === "unionops_app", "DATABASE_URL must use the restricted unionops_app role");
    const [occupied] = await owner`
      SELECT count(*)::int AS count FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_type='BASE TABLE'
    `;
    assert(Number(occupied?.count ?? 0) === 0, "upgrade fixture requires an empty disposable database");

    const journalPath = path.join(root, "src/lib/db/migrations/meta/_journal.json");
    const fullJournal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;
    const tailIndex = fullJournal.entries.findIndex((entry) => entry.tag === legacyTail);
    assert(tailIndex >= 0, `required legacy migration ${legacyTail} is missing`);
    const legacyEntries = fullJournal.entries.slice(0, tailIndex + 1);
    const legacyJournal: Journal = { ...fullJournal, entries: legacyEntries };
    mkdirSync(path.join(tempMigrations, "meta"), { recursive: true });
    for (const entry of legacyEntries) {
      copyFileSync(
        path.join(root, "src/lib/db/migrations", `${entry.tag}.sql`),
        path.join(tempMigrations, `${entry.tag}.sql`),
      );
    }
    writeFileSync(path.join(tempMigrations, "meta/_journal.json"), `${JSON.stringify(legacyJournal, null, 2)}\n`);

    await migrate(drizzle(owner), { migrationsFolder: tempMigrations });
    await insertLegacyFixture(owner);
    const deploy = spawnSync(process.execPath, [path.join(root, "docker/db-deploy.mjs")], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    if (deploy.error) throw deploy.error;
    assert(deploy.status === 0, `current database deploy gate exited with ${deploy.status ?? "no status"}`);

    const workbench = fullJournal.entries.find((entry) => entry.tag === "0040_data_workbench");
    assert(workbench, "combined journal must preserve upstream 0040_data_workbench");
    await verifyBackfill(owner, runtime, workbench.when);
    console.log(`[portal-upgrade-smoke] passed 0039-era upgrade through ${fullJournal.entries.at(-1)?.tag} using unionops_app`);
  } finally {
    await Promise.all([owner.end({ timeout: 5 }), runtime.end({ timeout: 5 })]);
    rmSync(tempMigrations, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[portal-upgrade-smoke] failed:", error);
  process.exitCode = 1;
});
