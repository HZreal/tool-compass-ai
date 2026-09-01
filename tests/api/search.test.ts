import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";

import { createSearchResponse, createToolsResponse } from "../../app/lib/public-api";
import { searchPublishedTools } from "../../app/lib/search";

const displayValues = ["Free tier", '["coding"]', "2026-08-31", "Test catalog metadata.", '["web"]', '["English"]'] as const;

async function createDatabase() {
  const miniflare = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('ok'); } };", d1Databases: ["DB"] });
  const db = await miniflare.getD1Database("DB");
  const migrations = await Promise.all(["0000_catalog.sql", "0001_catalog_metadata_order.sql", "0005_catalog_contract.sql"].map((file) => readFile(new URL(`../../drizzle/${file}`, import.meta.url), "utf8")));
  for (const migration of migrations) {
    for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await db.prepare(statement).run();
  }
  await db.batch([
    db.prepare("INSERT INTO scenes (id, slug, name, description) VALUES (1, 'coding', 'Coding', 'Build software'), (2, 'writing', 'Writing', 'Write better')"),
    ...Array.from({ length: 20 }, (_, index) => db.prepare("INSERT INTO tools (id, slug, name, description, website_url, pricing, tags, verified_at, editorial_note, platforms, languages, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(index + 1, `code-helper-${index + 1}`, index === 0 ? "代码助手" : `Code Helper ${index + 1}`, "A code helper for teams.", `https://example.com/${index + 1}`, ...displayValues, "published")),
    db.prepare("INSERT INTO tools (id, slug, name, description, website_url, pricing, tags, verified_at, editorial_note, platforms, languages, status) VALUES (21, 'archived-code-helper', 'Code Helper Archived', 'Archived code helper.', 'https://example.com/archived', 'Free tier', '[\"coding\"]', '2026-08-29', 'Archived test catalog metadata.', '[\"web\"]', '[\"English\"]', 'archived')"),
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

test("search uses 18-item pages, keeps totals beyond the last page, and returns scene suggestions for empty results", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const firstPage = await searchPublishedTools(db, "code-helper", 1);
  const secondPage = await searchPublishedTools(db, "code-helper", 2);
  assert.equal(firstPage.tools.length, 18);
  assert.equal(secondPage.tools.length, 2);
  assert.equal(secondPage.totalPages, 2);
  const thirdPage = await searchPublishedTools(db, "code-helper", 3);
  assert.deepEqual(thirdPage.tools, []);
  assert.equal(thirdPage.total, 20);
  assert.equal(thirdPage.totalPages, 2);
  assert.deepEqual(thirdPage.suggestedScenes, []);

  const response = await createSearchResponse(db, new Request("https://ai-scenery.test/api/search?q=not-found"));
  assert.equal(response.status, 200);
  const payload = await response.json() as { tools: unknown[]; suggestedScenes: { slug: string }[] };
  assert.deepEqual(payload.tools, []);
  assert.deepEqual(payload.suggestedScenes.map((scene) => scene.slug), ["coding", "writing"]);
});

test("tools API validates query bounds and safely treats FTS operators as text", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  for (const query of ["??", '""', "OR", "NEAR(code helper, 1)", "code*"]) {
    const response = await createToolsResponse(
      db,
      new Request(`https://ai-scenery.test/api/tools?q=${encodeURIComponent(query)}`),
    );
    assert.equal(response.status, 200, `expected ${query} to be searched as text`);
    assert.deepEqual((await response.json() as { tools: unknown[] }).tools, []);
  }

  for (const query of ["a", "a".repeat(81)]) {
    const response = await createToolsResponse(db, new Request(`https://ai-scenery.test/api/tools?q=${query}`));
    assert.equal(response.status, 400);
  }

  for (const query of ["ok", "a".repeat(80)]) {
    const response = await createToolsResponse(db, new Request(`https://ai-scenery.test/api/tools?q=${query}`));
    assert.equal(response.status, 200);
  }
});
