import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";

import { createSubmissionResponse } from "../../app/api/submissions/route";
import { createOutboundRedirectResponse } from "../../app/go/[slug]/route";

async function createDatabase() {
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } };",
    d1Databases: ["DB"],
  });
  const db = await miniflare.getD1Database("DB");
  const migrations = await Promise.all(["0000_catalog.sql", "0001_catalog_metadata_order.sql", "0002_submissions_outbound.sql", "0005_catalog_contract.sql", "0006_structured_pricing.sql", "0008_tool_sources.sql"].map(
    (file) => readFile(new URL(`../../drizzle/${file}`, import.meta.url), "utf8"),
  ));
  for (const migration of migrations) {
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim()) await db.prepare(statement).run();
    }
  }
  await db.prepare(`
    INSERT INTO tools (id, slug, name, description, website_url, pricing, tags, verified_at, editorial_note, platforms, languages, status)
    VALUES (1, 'chatgpt', 'ChatGPT', 'A general AI assistant.', 'https://chatgpt.com', 'Free', '[]', '2026-08-31', 'Test note', '[]', '[]', 'published')
  `).run();
  return { db, miniflare };
}

function postSubmission(body: unknown) {
  return new Request("https://ai-scenery.test/api/submissions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("accepts valid recommendations and corrections for review", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  for (const submission of [
    { type: "recommendation", toolName: "Example Tool", websiteUrl: "https://example.com", message: "值得收录", email: "editor@example.com" },
    { type: "correction", toolName: "ChatGPT", websiteUrl: "https://chatgpt.com", message: "官网资料需要更新" },
  ]) {
    const response = await createSubmissionResponse(db, postSubmission(submission));
    assert.equal(response.status, 201);
  }

  const rows = await db.prepare("SELECT type, tool_name AS toolName, website_url AS websiteUrl, email, status FROM submissions ORDER BY id").all<{
    type: string;
    toolName: string;
    websiteUrl: string;
    email: string | null;
    status: string;
  }>();
  assert.deepEqual(rows.results, [
    { type: "recommendation", toolName: "Example Tool", websiteUrl: "https://example.com/", email: "editor@example.com", status: "pending" },
    { type: "correction", toolName: "ChatGPT", websiteUrl: "https://chatgpt.com/", email: null, status: "pending" },
  ]);
});

test("rejects a submission whose website is not HTTPS", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const response = await createSubmissionResponse(db, postSubmission({
    type: "recommendation",
    toolName: "Unsafe Tool",
    websiteUrl: "http://example.com",
    message: "This must not be accepted.",
  }));

  assert.equal(response.status, 400);
  assert.match(await response.text(), /HTTPS/i);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM submissions").first<{ count: number }>())?.count, 0);
});

test("treats a filled honeypot as success without persisting a submission", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const response = await createSubmissionResponse(db, postSubmission({
    type: "recommendation",
    toolName: "Bot Tool",
    websiteUrl: "https://example.com",
    message: "This should be ignored.",
    company: "automation ltd",
  }));

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM submissions").first<{ count: number }>())?.count, 0);
});

test("redirects through an anonymous outbound event that stores only the tool and source path", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const response = await createOutboundRedirectResponse(
    db,
    new Request("https://ai-scenery.test/go/chatgpt", { headers: { referer: "https://ai-scenery.test/scene/chat?utm_source=test" } }),
    "chatgpt",
  );

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://chatgpt.com");
  const event = await db.prepare("SELECT tool_id AS toolId, source_path AS sourcePath FROM outbound_events").first<{
    toolId: number;
    sourcePath: string;
  }>();
  assert.deepEqual(event, { toolId: 1, sourcePath: "/scene/chat" });
  const columns = await db.prepare("PRAGMA table_info(outbound_events)").all<{ name: string }>();
  assert.deepEqual(columns.results.map((column: { name: string }) => column.name), ["id", "tool_id", "source_path", "created_at"]);
});

test("outbound redirect never persists query parameters or cross-origin referrer details", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  for (const referer of [
    "https://ai-scenery.test/tool/chatgpt?email=reader%40example.com&ip=203.0.113.9",
    "https://tracking.example/scene/chat?ip=203.0.113.9",
  ]) {
    const response = await createOutboundRedirectResponse(
      db,
      new Request("https://ai-scenery.test/go/chatgpt", { headers: { referer } }),
      "chatgpt",
    );
    assert.equal(response.status, 302);
  }

  const events = await db.prepare("SELECT source_path AS sourcePath FROM outbound_events ORDER BY id").all<{ sourcePath: string }>();
  assert.deepEqual(events.results, [{ sourcePath: "/tool/chatgpt" }, { sourcePath: "/" }]);
});
