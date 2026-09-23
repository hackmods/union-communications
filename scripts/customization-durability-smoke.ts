/** Disposable DB only. Leaves its synthetic publication for process-restart verification. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import postgres from "postgres";
import { DrizzleCustomizationAdapter } from "../src/lib/customization/drizzle-adapter";
import { resetDbClient } from "../src/lib/db/client";

async function main() {
  const ownerUrl = process.env.CUSTOMIZATION_TEST_DATABASE_URL;
  const runtimeUrl = process.env.DATABASE_URL;
  if (!ownerUrl || !runtimeUrl) throw new Error("Test owner and runtime URLs are required");
  const ownerTarget = new URL(ownerUrl), runtimeTarget = new URL(runtimeUrl);
  if (!['127.0.0.1','localhost'].includes(ownerTarget.hostname) || !ownerTarget.pathname.endsWith('_test') || ownerTarget.host !== runtimeTarget.host || ownerTarget.pathname !== runtimeTarget.pathname || runtimeTarget.username !== 'unionops_app') throw new Error("Use matching disposable local databases and the restricted runtime role");
  const owner = postgres(ownerUrl, { max: 1, onnotice: () => {} });
  const prefix = process.argv[3] ?? `dur-${randomUUID()}`;
  const context = { unionId: prefix, userId: prefix, mfaVerified: true };
  const adapter = new DrizzleCustomizationAdapter();
  try {
    if (process.argv[2] === '--verify') {
      const releases = await adapter.transaction(context, tx => tx.read('releases', { id: prefix }));
      assert.equal(releases.length, 1);
      assert.deepEqual(await adapter.readerTransaction(context, tx => tx.read('revisions', { id: prefix })), []);
      const fragments = await adapter.readerTransaction(context, tx => tx.read('fragments', { releaseId: prefix }));
      assert.deepEqual(fragments.map(row => row.payload), [{ text: 'durable public fragment' }]);
      console.log('Independent process read persisted publication and authorized fragments.');
      return;
    }
    await owner`insert into unions(id,name,slug,enabled_modules) values (${prefix},'Durability fixture',${prefix},'[]')`;
    await owner`insert into users(id,email,name,password_hash,roles) values (${prefix},${prefix+'@example.invalid'},'Fixture operator','unused','["platform_admin"]')`;
    let system = (await adapter.transaction({ userId: prefix, mfaVerified: true }, tx => tx.read('scopes', { kind: 'system' })))[0];
    if (!system) system = await adapter.transaction({ userId: prefix, mfaVerified: true }, tx => tx.insert('scopes', { id: prefix+'-system', kind: 'system' }));
    await adapter.transaction(context, async tx => {
      await tx.insert('scopes', { id: prefix, kind: 'union', unionId: prefix, parentScopeId: system.id });
      await tx.insert('resources', { id: prefix, scopeId: prefix, unionId: prefix, key: 'guide:durable', kind: 'guide', createdBy: prefix });
      await tx.insert('heads', { resourceId: prefix, scopeId: prefix, unionId: prefix, generation: 1 });
    });
    await assert.rejects(adapter.transaction(context, async tx => {
      await tx.update('heads', { resourceId: prefix, generation: 1 }, { generation: 2 });
      throw new Error('publication audit failure');
    }), /audit failure/);
    assert.equal((await adapter.transaction(context, tx => tx.read('heads', { resourceId: prefix })))[0].generation, 1);
    const races = await Promise.all([1,2].map(() => adapter.transaction(context, tx => tx.update('heads', { resourceId: prefix, generation: 1 }, { generation: 2 }))));
    assert.deepEqual(races.map(rows => rows.length).sort(), [0,1]);
    await adapter.transaction(context, async tx => {
      await tx.insert('revisions', { id: prefix, resourceId: prefix, scopeId: prefix, unionId: prefix, revisionNo: 1, schemaVersion: 1, payload: { schemaVersion: 1, key: 'guide:durable', scopeId: prefix, revisionId: prefix, mode: 'inherit' }, contentHash: 'fixture', createdBy: prefix, changeReason: 'Durability test' });
      await tx.insert('releases', { id: prefix, resourceId: prefix, scopeId: prefix, unionId: prefix, revisionId: prefix, dependencyManifest: {}, compiledDefaultVersion: 'fixture', publishedBy: prefix });
      await tx.insert('policies', { resourceId: prefix, scopeId: prefix, unionId: prefix, audience: 'public', enabled: true, policyVersion: 1, editableFields: [], updatedBy: prefix });
      await tx.insert('fragments', { id: prefix, resourceId: prefix, scopeId: prefix, unionId: prefix, releaseId: prefix, locale: 'en', fragmentId: 'body', kind: 'paragraph', ordinal: 0, minimumAudience: 'public', payload: { text: 'durable public fragment' } });
      await tx.update('heads', { resourceId: prefix, generation: 2 }, { generation: 3, activeReleaseId: prefix });
    });
    resetDbClient();
    const child = spawnSync(process.execPath, ['--import','tsx',process.argv[1],'--verify',prefix], { env: process.env, encoding: 'utf8', timeout: 30000 });
    assert.equal(child.status, 0, child.stderr || child.stdout);
    console.log(child.stdout.trim());
    console.log('Durable adapter: rollback, concurrent compare-and-swap, restricted-role publication, process restart passed.');
  } finally { resetDbClient(); await owner.end(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
