/** Apply the previous journal to an empty disposable DB, populate it, then upgrade. */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { runDatabaseDeploy } from '../docker/db-deploy.mjs';

const url = process.env.MIGRATE_DATABASE_URL;
if (!url) throw new Error('MIGRATE_DATABASE_URL required');
const target = new URL(url);
if (!['127.0.0.1','localhost'].includes(target.hostname) || !target.pathname.endsWith('_test')) throw new Error('Use an empty disposable loopback _test database');
const owner = postgres(url, { max: 1, onnotice: () => {} });
const temporary = mkdtempSync(join(tmpdir(),'customization-upgrade-'));
try {
  assert.equal((await owner`select tablename from pg_tables where schemaname='public'`).length,0,'upgrade fixture requires empty database');
  const journal = JSON.parse(readFileSync('src/lib/db/migrations/meta/_journal.json','utf8'));
  const cutoff = journal.entries.findIndex(entry=>entry.tag==='0054_customization_foundation');
  assert.ok(cutoff>0);
  const entries = journal.entries.slice(0,cutoff);
  mkdirSync(join(temporary,'meta'));
  writeFileSync(join(temporary,'meta/_journal.json'),JSON.stringify({...journal,entries}));
  for (const entry of entries) copyFileSync(`src/lib/db/migrations/${entry.tag}.sql`,join(temporary,`${entry.tag}.sql`));
  await migrate(drizzle(owner), { migrationsFolder: temporary });
  await owner`insert into unions(id,name,slug,enabled_modules) values ('cx-upgrade','Existing union','cx-upgrade','["grievance"]')`;
  await owner`insert into locals(id,union_id,local_number) values ('cx-upgrade-local','cx-upgrade','101')`;
  const before = await owner`select * from unions where id='cx-upgrade'`;
  await runDatabaseDeploy({ attestationPath: join(temporary,'attestation.json') });
  assert.deepEqual(await owner`select * from unions where id='cx-upgrade'`,before);
  assert.equal((await owner`select * from locals where id='cx-upgrade-local'`)[0].local_number,'101');
  assert.equal((await owner`select * from customization_resources`).length,0,'no tenant content is implicitly seeded');
  // A missing policy must fail the boot verifier; recreate it before the final pass.
  await owner`drop policy customization_fragments_reader on customization_delivery_fragments`;
  await assert.rejects(runDatabaseDeploy({ attestationPath: join(temporary,'attestation.json') }), /customization_fragments_reader/);
  await owner`create policy customization_fragments_reader on customization_delivery_fragments for select using (public.customization_fragment_access(resource_id,release_id,minimum_audience,fragment_id,control_resource_ids))`;
  await runDatabaseDeploy({ attestationPath: join(temporary,'attestation.json') });
  console.log('Populated 0053 → current upgrade preserved tenant records; missing RLS policy rejected; restored contract passed.');
} finally {
  await owner.end();
  assert.equal(dirname(resolve(temporary)),resolve(tmpdir()));
  rmSync(temporary,{recursive:true,force:true});
}
