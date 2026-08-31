import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";

import { createSearchResponse } from "../../app/lib/public-api";
import { searchPublishedTools } from "../../app/lib/search";

async function createDatabase() {
  const miniflare = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('ok'); } };", d1Databases: ["DB"] });
  const db = await miniflare.getD1Database("DB");
  const migration = await readFile(new URL("../../drizzle/0000_catalog.sql", import.meta.url), "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await db.prepare(statement).run();
  await db.batch([
    db.prepare("INSERT INTO scenes (id, slug, name, description) VALUES (1, 'coding', 'Coding', 'Build software'), (2, 'writing', 'Writing', 'Write better')"),
    ...Array.from({ length: 20 }, (_, index) => db.prepare("INSERT INTO tools (id, slug, name, description, website_url, status) VALUES (?, ?, ?, ?, ?, ?)").bind(index + 1, `code-helper-${index + 1}`, index === 0 ? "代码助手" : `Code Helper ${index + 1}`, "A code helper for teams.", `https://example.com/${index + 1}`, "published")),
    db.prepare("INSERT INTO tools (id, slug, name, description, website_url, status) VALUES (21, 'archived-code-helper', 'Code Helper Archived', 'Archived code helper.', 'https://example.com/archived', 'archived')"),
  ]);
  return { db, miniflare };
}

test("FTS matches Chinese names and English slugs while excluding archived tools", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const chinese = await searchPublishedTools(db, "代码助手", 1);
  const english = await searchPublishedTools(db, "code-helper", 1);
  assert.equal(chinese.tools[0]?.slug, "code-helper-1");
  assert.equal(english.total, 20);
  assert.ok(english.tools.every((tool) => tool.status === "published"));
});

test("search uses 18-item pages and returns scene suggestions for empty results", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const firstPage = await searchPublishedTools(db, "code-helper", 1);
  const secondPage = await searchPublishedTools(db, "code-helper", 2);
  assert.equal(firstPage.tools.length, 18);
  assert.equal(secondPage.tools.length, 2);
  assert.equal(secondPage.totalPages, 2);

  const response = await createSearchResponse(db, new Request("https://ai-scenery.test/api/search?q=not-found"));
  assert.equal(response.status, 200);
  const payload = await response.json() as { tools: unknown[]; suggestedScenes: { slug: string }[] };
  assert.deepEqual(payload.tools, []);
  assert.deepEqual(payload.suggestedScenes.map((scene) => scene.slug), ["coding", "writing"]);
});
