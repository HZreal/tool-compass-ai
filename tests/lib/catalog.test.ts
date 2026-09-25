import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";

import { getCatalogScene, getPublishedTool, listCatalogCategories, listCatalogScenes, listPublishedToolPage, listPublishedTools } from "../../app/lib/catalog";

async function createDatabase() {
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } };",
    d1Databases: ["DB"],
  });
  const db = await miniflare.getD1Database("DB");
  const migrations = await Promise.all(["0000_catalog.sql", "0001_catalog_metadata_order.sql", "0005_catalog_contract.sql", "0006_structured_pricing.sql", "0008_tool_sources.sql"].map((file) => readFile(new URL(`../../drizzle/${file}`, import.meta.url), "utf8")));
  for (const migration of migrations) {
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim()) await db.prepare(statement).run();
    }
  }
  await db.batch([
    db.prepare("INSERT INTO categories (id, slug, name, description, sort_order) VALUES (1, 'code', 'Code', 'Code tools', 2), (2, 'visual', 'Visual', 'Visual tools', 1)"),
    db.prepare("INSERT INTO scenes (id, slug, name, description, sort_order) VALUES (1, 'coding', 'Coding', 'Build software', 2), (2, 'visual', 'Visual', 'Create visuals', 1)"),
    db.prepare("INSERT INTO tools (id, slug, name, description, website_url, pricing, tags, verified_at, editorial_note, platforms, languages, status, featured) VALUES (1, 'published-code', 'Published Code', 'A published coding tool.', 'https://example.com/code', 'Free tier', '[\"coding\"]', '2026-08-31', 'Published code tool.', '[\"web\"]', '[\"English\"]', 'published', 1), (2, 'published-visual', 'Published Visual', 'A published visual tool.', 'https://example.com/visual', 'Paid plan', '[\"visual\"]', '2026-08-30', 'Published visual tool.', '[\"web\"]', '[\"English\"]', 'published', 0), (3, 'archived-code', 'Archived Code', 'An archived coding tool.', 'https://example.com/archived', 'Free tier', '[\"coding\"]', '2026-08-29', 'Archived code tool.', '[\"web\"]', '[\"English\"]', 'archived', 1), (4, 'draft-code', 'Draft Code', 'A draft coding tool.', 'https://example.com/draft', 'Free tier', '[\"coding\"]', '2026-08-29', 'Draft code tool.', '[\"web\"]', '[\"English\"]', 'draft', 1)"),
    db.prepare("INSERT INTO tool_categories (tool_id, category_id) VALUES (1, 1), (2, 2), (3, 1), (4, 1)"),
    db.prepare("INSERT INTO tool_scenes (tool_id, scene_id) VALUES (1, 1), (2, 2), (3, 1), (4, 1)"),
  ]);
  await db.prepare("UPDATE tools SET pricing_model = CASE WHEN id = 2 THEN 'paid' ELSE 'freemium' END").run();
  return { db, miniflare };
}

test("catalog only exposes published tools and intersects category and scene filters", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const tools = await listPublishedTools(db, { category: "code", scene: "coding" });
  assert.deepEqual(tools.map((tool) => tool.slug), ["published-code"]);
  assert.ok(tools.every((tool) => tool.status === "published"));
});

test("catalog pagination applies region, platform and pricing filters inside the D1 query", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const page = await listPublishedToolPage(db, {
    region: "overseas",
    platform: "web",
    pricing: "free",
    page: 1,
  });

  assert.deepEqual(page.tools.map((tool) => tool.slug), ["published-code"]);
  assert.equal(page.total, 1);
  assert.equal(page.page, 1);
  assert.equal(page.totalPages, 1);
});

test("published detail returns null for missing and archived slugs", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  assert.equal((await getPublishedTool(db, "published-code"))?.slug, "published-code");
  assert.equal(await getPublishedTool(db, "archived-code"), null);
  assert.equal(await getPublishedTool(db, "does-not-exist"), null);
});

test("catalog metadata comes from D1 with names, descriptions, and editorial order", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const categories = await listCatalogCategories(db);
  const scenes = await listCatalogScenes(db);
  const scene = await getCatalogScene(db, "coding");

  assert.deepEqual(categories.map(({ slug, name, description, sortOrder }) => ({ slug, name, description, sortOrder })), [
    { slug: "visual", name: "Visual", description: "Visual tools", sortOrder: 1 },
    { slug: "code", name: "Code", description: "Code tools", sortOrder: 2 },
  ]);
  assert.deepEqual(scenes.map(({ slug, name, description, sortOrder }) => ({ slug, name, description, sortOrder })), [
    { slug: "visual", name: "Visual", description: "Create visuals", sortOrder: 1 },
    { slug: "coding", name: "Coding", description: "Build software", sortOrder: 2 },
  ]);
  assert.deepEqual(scene, { slug: "coding", name: "Coding", description: "Build software", sortOrder: 2 });
  assert.equal(await getCatalogScene(db, "not-a-scene"), null);
});

test('aliases, editorial order, structured pricing and bounded pagination remain independent of prose',async t=>{
  const {db,miniflare}=await createDatabase();t.after(()=>miniflare.dispose());
  await db.prepare("UPDATE tools SET aliases='[\"代码别名\"]',featured_rank=5,pricing='not for free',pricing_model='paid' WHERE id=1").run();
  await db.prepare("UPDATE tools SET featured=1,featured_rank=1,pricing='付费扩展功能',pricing_model='freemium' WHERE id=2").run();
  assert.deepEqual((await listPublishedToolPage(db,{query:'代码别名'})).tools.map(t=>t.slug),['published-code']);
  assert.deepEqual((await listPublishedToolPage(db,{featured:true})).tools.map(t=>t.slug),['published-visual','published-code']);
  assert.deepEqual((await listPublishedToolPage(db,{pricing:'free'})).tools.map(t=>t.slug),['published-visual']);
  assert.equal((await listPublishedToolPage(db,{pricing:'paid'})).total,2);
  assert.equal((await listPublishedToolPage(db,{page:-8})).page,1);
  assert.equal((await listPublishedToolPage(db,{page:Infinity})).page,100);
  assert.equal((await listPublishedToolPage(db,{page:100})).tools.length,0);
  for(const [sql,index] of [
    ["SELECT id FROM tools WHERE status='published' AND region='domestic'",'tools_status_region_idx'],
    ["SELECT id FROM tools WHERE status='published' AND pricing_model='paid'",'tools_status_pricing_model_idx'],
  ]) {
    const plan=await db.prepare('EXPLAIN QUERY PLAN '+sql).all<{detail:string}>();
    assert.ok(plan.results.some(row=>row.detail.includes(index)),JSON.stringify(plan));
  }
});
