import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
import { exportBackup, restoreBackup } from '../../app/lib/backup';
import { importReviewedCatalog } from '../../app/lib/catalog-import';
import { createBackupResponse } from '../../app/api/admin/backup/route';
import { listPublishedToolPage } from '../../app/lib/catalog';

async function database() {
  const mf=new Miniflare({modules:true,script:"export default {fetch(){return new Response('ok')}}",d1Databases:['DB']});
  const db=await mf.getD1Database('DB');
  for(const file of (await readdir(new URL('../../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()) {
    for(const sql of (await readFile(new URL('../../drizzle/'+file,import.meta.url),'utf8')).split('--> statement-breakpoint')) if(sql.trim())await db.prepare(sql).run();
  }
  return {mf,db};
}

test('empty public reads never write; authenticated catalog import is idempotent, reviewed and searchable',async t=>{
  const {mf,db}=await database();t.after(()=>mf.dispose());
  assert.equal((await listPublishedToolPage(db)).total,0);
  assert.equal(await db.prepare('SELECT id FROM tools LIMIT 1').first(),null);
  await importReviewedCatalog(db); const second=await importReviewedCatalog(db);assert.equal(second.alreadyImported,true);
  assert.equal((await listPublishedToolPage(db)).total,92);
  const chinese=await listPublishedToolPage(db,{region:'domestic'});assert.equal(chinese.total,12);
  assert.equal((await listPublishedToolPage(db,{query:'深度求索'})).tools[0]?.slug,'deepseek');
  assert.equal((await listPublishedToolPage(db,{query:'豆包'})).tools[0]?.slug,'doubao');
  const free=await listPublishedToolPage(db,{region:'domestic',pricing:'free'});assert.ok(free.tools.some(tool=>tool.slug==='deepseek'));
  assert.ok(chinese.tools.every(tool=>tool.sources?.length && tool.verifiedAt==='2026-09-05'));
  assert.equal((await exportBackup(db)).tables.catalog_imports.length,1);
});

test('full backup restores all business data and FTS, leaving a restore audit',async t=>{
  const {mf,db}=await database();t.after(()=>mf.dispose());await importReviewedCatalog(db);
  const snapshot=await exportBackup(db);
  await db.prepare("UPDATE tools SET name='changed', tags='[]',status='archived' WHERE slug='deepseek'").run();
  await restoreBackup(db,snapshot);
  const after=await exportBackup(db);
  for(const table of Object.keys(snapshot.tables).filter(table=>table!=='admin_audit_events')) assert.deepEqual(after.tables[table],snapshot.tables[table],table);
  assert.equal(after.tables.admin_audit_events.length,snapshot.tables.admin_audit_events.length+1);
  assert.equal((await listPublishedToolPage(db,{query:'深度求索'})).tools[0]?.name,'DeepSeek');
  const bad=structuredClone(snapshot);bad.tables.tool_categories.push({tool_id:999999,category_id:1});
  await assert.rejects(restoreBackup(db,bad));
  assert.deepEqual((await exportBackup(db)).tables,after.tables,'failed restore must roll back every change');
  const duplicateSlug=structuredClone(snapshot);duplicateSlug.tables.tools[1].slug=duplicateSlug.tables.tools[0].slug;
  await assert.rejects(restoreBackup(db,duplicateSlug));
  assert.deepEqual((await exportBackup(db)).tables,after.tables,'SQL constraint failure must roll back deletes/inserts');
  for(const mutate of [
    (data:typeof snapshot)=>data.tables.tool_tags.push({...data.tables.tool_tags[0]}),
    (data:typeof snapshot)=>data.tables.tool_tags.push({tool_id:9999,tag_id:1}),
    (data:typeof snapshot)=>{data.tables.tools[0].name=42;},
    (data:typeof snapshot)=>{data.tables.tools[0].logo_url='javascript:alert(1)';},
  ]) {const invalid=structuredClone(snapshot);mutate(invalid);await assert.rejects(restoreBackup(db,invalid));}
});

test('backup rejects missing/foreign admins, cross-origin restore, invalid confirmation and partial backups',async t=>{
  const {mf,db}=await database();t.after(()=>mf.dispose());
  const url='https://site.test/api/admin/backup';
  assert.equal((await createBackupResponse(db,new Request(url),'owner')).status,401);
  assert.equal((await createBackupResponse(db,new Request(url,{headers:{'oai-authenticated-user-id':'other','oai-authenticated-user-email':'same@example.test'}}),'owner')).status,403);
  const headers={'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test','content-type':'application/json'};
  const response=await createBackupResponse(db,new Request(url,{headers}),'owner');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-disposition')!,/attachment/);
  const snapshot=await response.json();
  assert.equal((await createBackupResponse(db,new Request(url,{method:'POST',headers:{...headers,origin:'https://evil.test'},body:JSON.stringify({confirmation:'RESTORE TOOL COMPASS AI',backup:snapshot})}),'owner')).status,403);
  assert.equal((await createBackupResponse(db,new Request(url,{method:'POST',headers,body:JSON.stringify({confirmation:'no',backup:snapshot})}),'owner')).status,400);
  await assert.rejects(restoreBackup(db,{...snapshot as object,tables:{}}));
});
