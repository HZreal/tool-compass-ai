import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";

import { listPublishedTools } from "../../app/lib/db";
import { seedCatalog } from "../../db/seed";

async function createCatalogDatabase() {
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } };",
    d1Databases: ["DB"],
  });
  const db = await miniflare.getD1Database("DB");
  const migration = await readFile(
    new URL("../../drizzle/0000_catalog.sql", import.meta.url),
    "utf8",
  );

  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) await db.prepare(statement).run();
  }

  return { db, miniflare };
}

test("seeding twice keeps the catalog unique and searchable", async (t) => {
  const { db, miniflare } = await createCatalogDatabase();
  t.after(() => miniflare.dispose());

  await seedCatalog(db);
  await seedCatalog(db);

  const counts = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM categories) AS categories,
        (SELECT COUNT(*) FROM scenes) AS scenes,
        (SELECT COUNT(*) FROM tools) AS tools,
        (SELECT COUNT(*) FROM tool_categories) AS tool_categories,
        (SELECT COUNT(DISTINCT tool_id || ':' || category_id) FROM tool_categories) AS unique_tool_categories,
        (SELECT COUNT(*) FROM tool_scenes) AS tool_scenes,
        (SELECT COUNT(DISTINCT tool_id || ':' || scene_id) FROM tool_scenes) AS unique_tool_scenes`,
    )
    .first<Record<string, number>>();

  assert.deepEqual(counts, {
    categories: 8,
    scenes: 6,
    tools: 80,
    tool_categories: counts?.unique_tool_categories,
    unique_tool_categories: counts?.unique_tool_categories,
    tool_scenes: counts?.unique_tool_scenes,
    unique_tool_scenes: counts?.unique_tool_scenes,
  });

  const results = await listPublishedTools(db, { query: "GitHub" });
  assert.ok(results.some((tool) => tool.slug === "github"));
  assert.ok(results.every((tool) => tool.status === "published"));

  const plan = await db
    .prepare("EXPLAIN QUERY PLAN SELECT rowid FROM tools_fts WHERE tools_fts MATCH 'GitHub'")
    .all<{ detail: string }>();
  assert.ok(
    plan.results.some((row) => /VIRTUAL TABLE INDEX/i.test(row.detail)),
    `expected FTS virtual-table access, received: ${JSON.stringify(plan.results)}`,
  );
});
