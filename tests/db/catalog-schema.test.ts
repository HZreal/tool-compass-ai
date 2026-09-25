import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";

import { getPublishedTool, listPublishedTools } from "../../app/lib/db";
import { searchPublishedTools } from "../../app/lib/search";
import { renderCatalogResetSql, seedCatalog } from "../../db/seed";

async function createCatalogDatabase() {
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } };",
    d1Databases: ["DB"],
  });
  const db = await miniflare.getD1Database("DB");
  const migrations = await Promise.all(["0000_catalog.sql", "0001_catalog_metadata_order.sql", "0002_submissions_outbound.sql", "0003_admin_audit_events.sql", "0004_submission_review_audit_trigger.sql", "0005_catalog_contract.sql", "0006_structured_pricing.sql", "0008_tool_sources.sql"].map((file) => readFile(
    new URL(`../../drizzle/${file}`, import.meta.url),
    "utf8",
  )));

  for (const migration of migrations) {
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim()) await db.prepare(statement).run();
    }
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
    tools: 92,
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
    pricing: "官方提供 Free 免费版与个人、企业付费套餐；付费扩展模型、功能和用量，仍受适用额度与使用规则约束。",
    tags: ["chat", "writing", "multimodal"],
    verifiedAt: "2026-09-05",
    editorialNote: "适合从问题讨论到内容初稿的综合任务；上传、图像和研究等能力有套餐限制，重要事实及生成代码需自行复核。",
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

test("seed catalog uses the product taxonomy and exposes editorial discovery fields", async (t) => {
  const { db, miniflare } = await createCatalogDatabase();
  t.after(() => miniflare.dispose());
  await seedCatalog(db);

  assert.deepEqual(
    (await db.prepare("SELECT name FROM categories ORDER BY sort_order").all<{ name: string }>()).results.map((row) => row.name),
    ["聊天与问答", "写作与翻译", "图像与设计", "视频与音频", "办公与效率", "编程与开发", "智能体与自动化", "学习与研究"],
  );
  assert.deepEqual(
    (await db.prepare("SELECT name FROM scenes ORDER BY sort_order").all<{ name: string }>()).results.map((row) => row.name),
    ["写文章", "做 PPT", "生成图片", "制作视频", "提升办公效率", "辅助编程"],
  );

  const chatgpt = await getPublishedTool(db, "chatgpt");
  assert.deepEqual(chatgpt?.aliases, ["OpenAI ChatGPT", "GPT", "Chat GPT"]);
  assert.equal(chatgpt?.region, "overseas");
  assert.ok(chatgpt?.logoUrl?.startsWith("https://"));
  assert.equal(chatgpt?.featuredRank, 1);
});

test("catalog reset SQL removes legacy taxonomy and recreates the product seed", async (t) => {
  const { db, miniflare } = await createCatalogDatabase();
  t.after(() => miniflare.dispose());
  await seedCatalog(db);
  await db.prepare("INSERT INTO categories (slug, name, description, sort_order) VALUES ('legacy', 'Legacy', 'Old seed', 99)").run();

  for (const statement of renderCatalogResetSql().split("--> statement-breakpoint")) {
    if (statement.trim()) await db.prepare(statement).run();
  }

  const counts = await db.prepare("SELECT (SELECT COUNT(*) FROM categories) AS categories, (SELECT COUNT(*) FROM scenes) AS scenes, (SELECT COUNT(*) FROM tools) AS tools").first<{ categories: number; scenes: number; tools: number }>();
  assert.deepEqual(counts, { categories: 8, scenes: 6, tools: 92 });
  assert.equal(await db.prepare("SELECT slug FROM categories WHERE slug = 'legacy'").first(), null);
  assert.ok((await getPublishedTool(db, "chatgpt"))?.aliases.includes("GPT"));
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
