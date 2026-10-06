import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";
import { createAdminTaxonomyResponse } from "../../app/api/admin/taxonomy/route";

async function database() {
  const mf = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('ok'); } };", d1Databases: ["DB"] });
  const db = await mf.getD1Database("DB");
  const directory = new URL("../../drizzle/", import.meta.url);
  for (const file of (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort()) {
    for (const sql of (await readFile(new URL(file, directory), "utf8")).split("--> statement-breakpoint")) {
      if (sql.trim()) await db.prepare(sql).run();
    }
  }
  return { db, mf };
}

function request(method: string, body?: unknown, user = "editor") {
  return new Request("https://example.test/api/admin/taxonomy", { method, headers: { "oai-authenticated-user-id": user, "oai-authenticated-user-email": "editor@example.com", "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
}

test("taxonomy CRUD preserves order, rejects duplicate slugs, audits and authorizes", async (t) => {
  const { db, mf } = await database(); t.after(() => mf.dispose());
  assert.equal((await createAdminTaxonomyResponse(db, request("GET", undefined, "other"), "editor")).status, 403);
  for (const kind of ["categories", "scenes", "tags"]) {
    const created = await createAdminTaxonomyResponse(db, request("POST", { kind, slug: "test", name: "Test", description: "Description", sortOrder: 5 }), "editor");
    assert.equal(created.status, 201);
    assert.equal(created.headers.get("cache-control"), "no-store");
    const { item } = await created.json() as { item: { id: number } };
    assert.equal((await createAdminTaxonomyResponse(db, request("POST", { kind, slug: "test", name: "Another" }), "editor")).status, 409);
    assert.equal((await createAdminTaxonomyResponse(db, request("PATCH", { kind, id: item.id, slug: "test", name: "Renamed", description: "Changed", sortOrder: -3 }), "editor")).status, 200);
    const row = await db.prepare(`SELECT name, sort_order FROM ${kind} WHERE id = ?`).bind(item.id).first();
    assert.deepEqual(row, { name: "Renamed", sort_order: -3 });
    assert.equal((await createAdminTaxonomyResponse(db, request("DELETE", { kind, id: item.id }), "editor")).status, 200);
    assert.equal((await createAdminTaxonomyResponse(db, request("DELETE", { kind, id: item.id }), "editor")).status, 404);
  }
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM admin_audit_events").first<{ n: number }>())?.n, 9);
});

test("referenced category and scene deletion is rejected, tag rename/delete synchronizes JSON and FTS", async (t) => {
  const { db, mf } = await database(); t.after(() => mf.dispose());
  await db.batch([
    db.prepare("INSERT INTO categories(id,slug,name,description) VALUES (1,'category','Category','')"),
    db.prepare("INSERT INTO scenes(id,slug,name,description) VALUES (1,'scene','Scene','')"),
    db.prepare(`INSERT INTO tools(id,slug,name,description,website_url,pricing,tags,verified_at,editorial_note,platforms,languages,status) VALUES (1,'tool','Tool','An example tool description','https://example.com/','Free','["quasarlabel"]','2026-09-01','','[]','[]','published')`),
    db.prepare("INSERT INTO tool_categories VALUES (1,1)"),
    db.prepare("INSERT INTO tool_scenes VALUES (1,1)"),
  ]);
  for (const kind of ["categories", "scenes"]) {
    assert.equal((await createAdminTaxonomyResponse(db, request("DELETE", { kind, id: 1 }), "editor")).status, 409);
  }
  const tag = await db.prepare("SELECT id,slug FROM tags WHERE name='quasarlabel'").first<{ id: number; slug: string }>();
  assert.ok(tag);
  assert.equal((await createAdminTaxonomyResponse(db, request("PATCH", { kind: "tags", ...tag, name: "nebularlabel", sortOrder: 2 }), "editor")).status, 200);
  assert.equal((await db.prepare("SELECT tags FROM tools WHERE id=1").first<{ tags: string }>())?.tags, '["nebularlabel"]');
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM tools_fts WHERE tools_fts MATCH 'nebularlabel'").first<{ n: number }>())?.n, 1);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM tools_fts WHERE tools_fts MATCH 'quasarlabel'").first<{ n: number }>())?.n, 0);
  assert.equal((await createAdminTaxonomyResponse(db, request("DELETE", { kind: "tags", id: tag.id }), "editor")).status, 200);
  assert.equal((await db.prepare("SELECT tags FROM tools WHERE id=1").first<{ tags: string }>())?.tags, '[]');
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM tool_tags").first<{ n: number }>())?.n, 0);
});
