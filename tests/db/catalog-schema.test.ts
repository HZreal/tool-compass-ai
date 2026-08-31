import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";

import { getPublishedTool, listPublishedTools } from "../../app/lib/db";
import { searchPublishedTools } from "../../app/lib/search";
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

test("seeded published tools expose their display metadata through catalog and FTS search", async (t) => {
  const { db, miniflare } = await createCatalogDatabase();
  t.after(() => miniflare.dispose());

  await seedCatalog(db);

  const expectedDisplayMetadata = {
    pricing: "Free tier; Plus and Pro subscriptions",
    tags: ["chat", "writing", "multimodal"],
    verifiedAt: "2026-08-31",
    editorialNote: "A reliable general-purpose assistant for drafting, brainstorming, and everyday problem-solving.",
    platforms: ["web", "macOS", "Windows", "iOS", "Android"],
    languages: ["Chinese", "English", "Japanese"],
  };

  const detail = await getPublishedTool(db, "chatgpt");
  const listed = await listPublishedTools(db, { query: "ChatGPT" });
  const searched = await searchPublishedTools(db, "ChatGPT");

  assert.deepEqual(pickDisplayMetadata(detail), expectedDisplayMetadata);
  assert.deepEqual(pickDisplayMetadata(listed.find((tool) => tool.slug === "chatgpt")), expectedDisplayMetadata);
  assert.deepEqual(pickDisplayMetadata(searched.tools.find((tool) => tool.slug === "chatgpt")), expectedDisplayMetadata);
});

function pickDisplayMetadata(tool: Awaited<ReturnType<typeof getPublishedTool>> | undefined) {
  return tool && {
    pricing: tool.pricing,
    tags: tool.tags,
    verifiedAt: tool.verifiedAt,
    editorialNote: tool.editorialNote,
    platforms: tool.platforms,
    languages: tool.languages,
  };
}

test("D1 notes example resolves its independent notes schema", async () => {
  const route = await readFile(
    new URL("../../examples/d1/app/api/notes/route.ts", import.meta.url),
    "utf8",
  );
  const schema = await readFile(
    new URL("../../examples/d1/db/schema.ts", import.meta.url),
    "utf8",
  );

  assert.match(route, /from\s+["']\.\.\/\.\.\/\.\.\/db\/schema["']/);
  assert.match(schema, /export const notes\s*=\s*sqliteTable\("notes"/);
});
