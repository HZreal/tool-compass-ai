import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";
import { renderToStaticMarkup } from "react-dom/server";

import { HomeView } from "../../app/page";
import { listPublishedTools } from "../../app/lib/catalog";
import { seedCatalog } from "../../db/seed";

async function renderHome() {
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } };",
    d1Databases: ["DB"],
  });
  const db = await miniflare.getD1Database("DB");
  const migrations = await Promise.all(["0000_catalog.sql", "0001_catalog_metadata_order.sql"].map((file) => readFile(new URL(`../../drizzle/${file}`, import.meta.url), "utf8")));
  for (const migration of migrations) {
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim()) await db.prepare(statement).run();
    }
  }
  await seedCatalog(db);
  const featuredTools = await listPublishedTools(db, { featured: true });
  const { listCatalogCategories, listCatalogScenes } = await import("../../app/lib/catalog");
  const [categories, scenes] = await Promise.all([listCatalogCategories(db), listCatalogScenes(db)]);
  return { html: renderToStaticMarkup(<HomeView featuredTools={featuredTools} categories={categories} scenes={scenes} />), miniflare };
}

test("renders the AI Scenery heading inside the main landmark", async (t) => {
  const { html, miniflare } = await renderHome();
  t.after(() => miniflare.dispose());
  assert.match(html, /<main[\s>][\s\S]*?<h1[^>]*>AI Scenery<\/h1>[\s\S]*?<\/main>/i);
});

test("keeps the narrow shell within the viewport without relying on a global reset", async () => {
  const css = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");

  assert.match(
    css,
    /\.site-shell\s*\{[\s\S]*?box-sizing:\s*border-box;/,
  );
  assert.match(css, /\.hero\s*\{[\s\S]*?box-sizing:\s*border-box;/);
});
