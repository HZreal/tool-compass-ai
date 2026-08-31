import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";

import { getPublishedTool, listPublishedTools } from "../../app/lib/catalog";

async function createDatabase() {
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } };",
    d1Databases: ["DB"],
  });
  const db = await miniflare.getD1Database("DB");
  const migration = await readFile(new URL("../../drizzle/0000_catalog.sql", import.meta.url), "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) await db.prepare(statement).run();
  }
  await db.batch([
    db.prepare("INSERT INTO categories (id, slug, name, description) VALUES (1, 'code', 'Code', 'Code tools'), (2, 'visual', 'Visual', 'Visual tools')"),
    db.prepare("INSERT INTO scenes (id, slug, name, description) VALUES (1, 'coding', 'Coding', 'Build software'), (2, 'visual', 'Visual', 'Create visuals')"),
    db.prepare("INSERT INTO tools (id, slug, name, description, website_url, status, featured) VALUES (1, 'published-code', 'Published Code', 'A published coding tool.', 'https://example.com/code', 'published', 1), (2, 'published-visual', 'Published Visual', 'A published visual tool.', 'https://example.com/visual', 'published', 0), (3, 'archived-code', 'Archived Code', 'An archived coding tool.', 'https://example.com/archived', 'archived', 1), (4, 'draft-code', 'Draft Code', 'A draft coding tool.', 'https://example.com/draft', 'draft', 1)"),
    db.prepare("INSERT INTO tool_categories (tool_id, category_id) VALUES (1, 1), (2, 2), (3, 1), (4, 1)"),
    db.prepare("INSERT INTO tool_scenes (tool_id, scene_id) VALUES (1, 1), (2, 2), (3, 1), (4, 1)"),
  ]);
  return { db, miniflare };
}

test("catalog only exposes published tools and intersects category and scene filters", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const tools = await listPublishedTools(db, { category: "code", scene: "coding" });
  assert.deepEqual(tools.map((tool) => tool.slug), ["published-code"]);
  assert.ok(tools.every((tool) => tool.status === "published"));
});

test("published detail returns null for missing and archived slugs", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  assert.equal((await getPublishedTool(db, "published-code"))?.slug, "published-code");
  assert.equal(await getPublishedTool(db, "archived-code"), null);
  assert.equal(await getPublishedTool(db, "does-not-exist"), null);
});
