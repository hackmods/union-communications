/** Isolated PostgreSQL contract test. All fixtures roll back, including on failure. */
import assert from 'node:assert/strict';
import postgres from 'postgres';

const url = process.env.CUSTOMIZATION_TEST_DATABASE_URL;
if (!url) throw new Error('CUSTOMIZATION_TEST_DATABASE_URL is required');
const target = new URL(url);
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !target.pathname.endsWith('_test')) {
  throw new Error('Use a disposable loopback database whose name ends in _test');
}
const db = postgres(url, { max: 1, onnotice: () => {} });
const rollback = new Error('fixture rollback');
let assertions = 0;
const check = (actual, expected, message) => { assert.deepEqual(actual, expected, message); assertions++; };
try {
  await db.begin(async (sql) => {
    await sql`insert into unions(id,name,slug,enabled_modules) values ('cx-a','Fixture A','cx-a','[]'),('cx-b','Fixture B','cx-b','[]')`;
    await sql`insert into locals(id,union_id,local_number) values ('cx-la','cx-a','101'),('cx-lb','cx-b','101'),('cx-other','cx-a','102')`;
    for (const [id, roles] of [['cx-root',['platform_admin']],['cx-member',['member']],['cx-officer',['member']]]) {
      await sql`insert into users(id,email,name,password_hash,union_id,roles) values (${id},${id+'@example.invalid'},${id},'unused','cx-a',${sql.json(roles)})`;
    }
    await sql`insert into local_memberships(id,union_id,local_id,user_id,created_by_id) values ('cx-m1','cx-a','cx-la','cx-member','cx-root'),('cx-m2','cx-a','cx-la','cx-officer','cx-root')`;
    await sql`insert into officer_assignments(id,union_id,local_id,user_id,position,assigned_by_id) values ('cx-off','cx-a','cx-la','cx-officer','steward','cx-root')`;
    let systemId = (await sql`select id from customization_scopes where kind='system'`)[0]?.id;
    if (!systemId) { systemId = 'cx-system'; await sql`insert into customization_scopes(id,kind) values (${systemId},'system')`; }
    await sql`insert into customization_scopes(id,kind,union_id,parent_scope_id) values ('cx-union','union','cx-a',${systemId}),('cx-union-b','union','cx-b',${systemId})`;
    await sql`insert into customization_scopes(id,kind,union_id,local_id,parent_scope_id) values ('cx-local','local','cx-a','cx-la','cx-union')`;
    await sql`insert into customization_resources(id,scope_id,union_id,key,kind,created_by) values ('cx-guide','cx-local','cx-a','guide:fixture','guide','cx-root')`;
    await sql`insert into customization_revisions(id,resource_id,scope_id,union_id,revision_no,schema_version,payload,content_hash,created_by,change_reason) values ('cx-revision','cx-guide','cx-local','cx-a',1,1,'{}','fixture','cx-root','test')`;
    await sql`insert into customization_releases(id,resource_id,scope_id,union_id,revision_id,dependency_manifest,compiled_default_version,published_by) values ('cx-release','cx-guide','cx-local','cx-a','cx-revision','{}','test','cx-root')`;
    await sql`insert into customization_heads(resource_id,scope_id,union_id,active_release_id,generation) values ('cx-guide','cx-local','cx-a','cx-release',1)`;
    await sql`insert into customization_policy(resource_id,scope_id,union_id,audience,enabled,policy_version,editable_fields,updated_by) values ('cx-guide','cx-local','cx-a','public',true,1,'[]','cx-root')`;
    for (const [ordinal, audience] of ['public','verified_member','local_officer'].entries()) {
      await sql`insert into customization_delivery_fragments(id,release_id,resource_id,scope_id,union_id,locale,fragment_id,kind,ordinal,minimum_audience,payload) values (${audience},'cx-release','cx-guide','cx-local','cx-a','en',${audience},'paragraph',${ordinal},${audience},${sql.json({text:audience})})`;
    }
    await sql`insert into customization_public_projections(id,resource_id,release_id,scope_id,union_id,locale,public_dto,policy_version) values ('cx-projection','cx-guide','cx-release','cx-local','cx-a','en','{"title":"Public title"}',1)`;
    await sql`insert into customization_drafts(resource_id,scope_id,union_id,payload,schema_version,lock_version,updated_by) values ('cx-guide','cx-local','cx-a','{}',1,1,'cx-root')`;
    await sql`insert into customization_maintenance_grants(id,scope_id,union_id,user_id,capabilities,resource_kinds,starts_at,ends_at,granted_by,reason) values ('cx-grant','cx-local','cx-a','cx-member','["customization.edit"]','["guide"]',now(),now()+interval '1 day','cx-root','fixture')`;
    await sql`insert into customization_assets(id,scope_id,union_id,storage_key,mime,bytes,hash,scan_status,rights_note,alt_text,created_by) values ('cx-asset','cx-local','cx-a','private/fixture','image/png',100,'fixture','clean','Fixture','{"en":"Fixture","fr":"Exemple"}','cx-root')`;
    await sql`insert into customization_audit(id,scope_id,union_id,actor_id,action,metadata,reason) values ('cx-audit','cx-local','cx-a','cx-root','fixture','{}','test')`;
    await sql`insert into customization_operations(id,scope_id,union_id,actor_id,operation_key,request_hash,result) values ('cx-operation','cx-local','cx-a','cx-root','fixture','fixture','{}')`;
    await sql`insert into customization_preset_bindings(id,scope_id,union_id,preset_id,updated_by) values ('cx-binding','cx-local','cx-a','fixture','cx-root')`;
    await sql`insert into customization_section_controls(id,resource_id,scope_id,union_id,block_id,minimum_audience,policy_version,updated_by) values ('cx-officer-section','cx-guide','cx-local','cx-a','local_officer','local_officer',1,'cx-root')`;
    const tables = (await sql`select tablename from pg_tables where schemaname='public' and tablename like 'customization_%'`).map(r=>r.tablename);
    const rawTables = tables.filter(t=>!['customization_delivery_fragments','customization_public_projections'].includes(t));
    const samples = new Map();
    for (const table of tables) {
      const [sample] = await sql`select to_jsonb(t) as row from ${sql(table)} t where union_id='cx-a' limit 1`;
      assert.ok(sample, `${table} must have a populated negative-test fixture`);
      samples.set(table,sample.row);
    }
    const context = async (user='', union='cx-a', local='cx-la', mfa=false) => {
      await sql`set local role unionops_app`;
      await sql`select set_config('app.current_user_id',${user},true),set_config('app.current_union_id',${union},true),set_config('app.current_local_id',${local},true),set_config('app.current_mfa_verified',${String(mfa)},true)`;
      check((await sql`select current_user as role`)[0].role,'unionops_app','restricted role is active');
    };
    const fragments = async () => (await sql`select fragment_id from customization_delivery_fragments order by ordinal`).map(r=>r.fragment_id);
    const rejects = async (run, code) => {
      await assert.rejects(sql.savepoint(run), error => code ? error.code === code : Boolean(error.code)); assertions++;
    };
    await context();
    check(await fragments(),['public'],'anonymous gets public fragment only');
    for (const table of rawTables) {
      check((await sql`select * from ${sql(table)}`).length,0,`${table} raw rows stay private`);
      await rejects(tx=>tx`insert into ${sql(table)} select * from jsonb_populate_record(null::${sql(table)},${sql.json(samples.get(table))})`,'42501');
      const field = table === 'customization_scopes' ? 'id' : 'scope_id';
      check((await sql`update ${sql(table)} set ${sql(field)}=${sql(field)} returning *`).length,0,`${table} update denied`);
      check((await sql`delete from ${sql(table)} returning *`).length,0,`${table} delete denied`);
    }
    check((await sql`select * from customization_public_projections`).length,1,'current public metadata');
    for (const table of tables.filter(t=>!rawTables.includes(t))) {
      await rejects(tx=>tx`insert into ${sql(table)} select * from jsonb_populate_record(null::${sql(table)},${sql.json(samples.get(table))})`,'42501');
      check((await sql`update ${sql(table)} set scope_id=scope_id returning *`).length,0,`${table} reader cannot update`);
      check((await sql`delete from ${sql(table)} returning *`).length,0,`${table} reader cannot delete`);
    }
    await rejects(tx=>tx`insert into customization_resources(id,scope_id,union_id,key,kind,created_by) values ('cx-forged','cx-local','cx-a','guide:forged','guide','cx-root')`,'42501');
    check((await sql`update customization_policy set enabled=false returning resource_id`).length,0,'anonymous update denied');
    check((await sql`delete from customization_heads returning resource_id`).length,0,'anonymous delete denied');
    await context('cx-member');
    check(await fragments(),['public','verified_member'],'member cannot select officer bytes');
    await context('cx-member','cx-a','cx-other');
    check(await fragments(),['public'],'wrong current local denies private bytes');
    await context('cx-member','cx-b','cx-lb');
    check(await fragments(),[],'same display number in another union grants nothing');
    await context('cx-officer');
    check(await fragments(),['public','verified_member','local_officer'],'canonical officer assignment');
    await sql`reset role`;
    await sql`update officer_assignments set revoked_at=now() where id='cx-off'`;
    await context('cx-officer');
    check(await fragments(),['public','verified_member'],'revocation takes effect immediately');
    await context('cx-root','cx-a','cx-la',false);
    check((await sql`select * from customization_revisions`).length,0,'Root without MFA cannot author');
    await context('cx-root','cx-b','cx-lb',true);
    check((await sql`select * from customization_revisions`).length,0,'Root target remains exact');
    await context('cx-root','cx-a','cx-la',true);
    check((await sql`select * from customization_revisions`).length,1,'Root authoring read');
    await rejects(tx=>tx`update customization_revisions set content_hash='changed' where id='cx-revision'`);
    await rejects(tx=>tx`delete from customization_releases where id='cx-release'`);
    await rejects(tx=>tx`insert into customization_resources(id,scope_id,union_id,key,kind,created_by) values ('cx-forged','cx-union-b','cx-a','guide:forged','guide','cx-root')`);
    await rejects(tx=>tx`insert into customization_scopes(id,kind,union_id,parent_scope_id) values ('cx-bad-parent','union','cx-a','missing-parent')`);
    await rejects(tx=>tx`update customization_scopes set union_id='cx-b' where id='cx-union'`);
    await sql`update customization_heads set active_release_id=null where resource_id='cx-guide'`;
    await context('cx-member');
    check(await fragments(),[],'old release fragments cannot outlive the active head');
    await context('cx-root','cx-a','cx-la',true);
    await sql`update customization_heads set active_release_id='cx-release' where resource_id='cx-guide'`;
    await sql`reset role`;
    await sql`update local_memberships set ended_at=now() where id='cx-m1'`;
    await context('cx-member');
    check(await fragments(),['public'],'membership revocation removes private bytes immediately');
    await sql`reset role`;
    await sql`update local_memberships set ended_at=null where id='cx-m1'`;
    const functions = await sql`select proname,proconfig,proacl from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname like 'customization_%' and prosecdef`;
    check(functions.every(row=>row.proconfig?.includes('search_path=pg_catalog, public')),true,'definer helpers have a fixed search path');
    const publicGrants = await sql`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='public' and p.proname like 'customization_%' and p.prosecdef and a.grantee=0 and a.privilege_type='EXECUTE'`;
    check(publicGrants.length,0,'definer helpers have no PUBLIC execute grant');
    await context('cx-root','cx-a','cx-la',true);
    await sql`insert into customization_section_controls(id,resource_id,scope_id,union_id,block_id,minimum_audience,policy_version,updated_by) values ('cx-section','cx-guide','cx-local','cx-a','public','local_officer',1,'cx-root')`;
    await context('cx-member');
    check(await fragments(),['verified_member'],'section tightening filters previously public bytes');
    await context('cx-root','cx-a','cx-la',true);
    await sql`update customization_policy set withdrawn_at=now() where resource_id='cx-guide'`;
    await context('cx-member');
    check(await fragments(),[],'withdrawal denies every fragment');
    check((await sql`select * from customization_public_projections`).length,0,'withdrawal removes discovery');
    throw rollback;
  });
} catch (error) { if (error !== rollback) throw error; }
finally { await db.end(); }
console.log(`Customization restricted-role checks passed: ${assertions}; fixtures rolled back.`);
