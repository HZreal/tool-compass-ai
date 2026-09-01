import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";
import { renderToStaticMarkup } from "react-dom/server";

import { AdminHomeView } from "../../app/admin/page";
import { AdminSubmissionsView } from "../../app/admin/submissions/page";
import { AdminToolsView } from "../../app/admin/tools/page";
import { createAdminSubmissionsResponse } from "../../app/api/admin/submissions/route";
import { createAdminToolsResponse } from "../../app/api/admin/tools/route";
import { listPublishedTools } from "../../app/lib/catalog";

const ADMIN_USER_ID = "user-admin-001";
const ADMIN_EMAIL = "editor@example.com";

async function createDatabase() {
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok'); } };",
    d1Databases: ["DB"],
  });
  const db = await miniflare.getD1Database("DB");
  const migrations = await Promise.all(
    [
      "0000_catalog.sql",
      "0001_catalog_metadata_order.sql",
      "0002_submissions_outbound.sql",
      "0003_admin_audit_events.sql",
      "0004_submission_review_audit_trigger.sql",
    ].map((file) =>
      readFile(new URL(`../../drizzle/${file}`, import.meta.url), "utf8"),
    ),
  );
  for (const migration of migrations) {
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim()) await db.prepare(statement).run();
    }
  }
  await db.batch([
    db.prepare(
      "INSERT INTO categories (id, slug, name, description, sort_order) VALUES (1, 'productivity', '效率工具', '提高日常工作效率', 1)",
    ),
    db.prepare(
      "INSERT INTO scenes (id, slug, name, description, sort_order) VALUES (1, 'research', '研究分析', '查找并组织资料', 1)",
    ),
  ]);
  return { db, miniflare };
}

function adminRequest(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
  userId = ADMIN_USER_ID,
) {
  const headers = new Headers({
    "oai-authenticated-user-id": userId,
    "oai-authenticated-user-email": ADMIN_EMAIL,
  });
  if (body !== undefined) headers.set("content-type", "application/json");
  return new Request(`https://ai-scenery.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const completeTool = {
  slug: "ai-notebook",
  name: "AI Notebook",
  description: "A focused workspace for researching and organizing reliable notes.",
  websiteUrl: "https://example.com/notebook",
  pricing: "Free trial; paid plans",
  tags: ["research", "notes"],
  verifiedAt: "2026-08-31",
  editorialNote: "适合需要持续整理研究材料的知识工作者。",
  platforms: ["web", "macOS"],
  languages: ["Chinese", "English"],
  featured: false,
  categorySlugs: ["productivity"],
  sceneSlugs: ["research"],
};

test("admin tool routes reject anonymous and signed-in non-admin requests", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const anonymous = new Request("https://ai-scenery.test/api/admin/tools", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(completeTool),
  });
  const anonymousResponse = await createAdminToolsResponse(
    db,
    anonymous,
    ADMIN_USER_ID,
  );
  const nonAdminResponse = await createAdminToolsResponse(
    db,
    adminRequest("/api/admin/tools", "POST", completeTool, "user-not-admin"),
    ADMIN_USER_ID,
  );

  assert.equal(anonymousResponse.status, 401);
  assert.equal(nonAdminResponse.status, 403);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS count FROM tools").first<{ count: number }>())?.count,
    0,
  );
});

test("a tool stays private as a draft, becomes public when published, and disappears when archived", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const created = await createAdminToolsResponse(
    db,
    adminRequest("/api/admin/tools", "POST", completeTool),
    ADMIN_USER_ID,
  );
  assert.equal(created.status, 201);
  const createdBody = (await created.json()) as { tool: { id: number; status: string } };
  assert.equal(createdBody.tool.status, "draft");
  assert.deepEqual(await listPublishedTools(db), []);

  const edited = await createAdminToolsResponse(
    db,
    adminRequest("/api/admin/tools", "PATCH", {
      id: createdBody.tool.id,
      action: "edit",
      tool: { ...completeTool, name: "AI Research Notebook", featured: true },
    }),
    ADMIN_USER_ID,
  );
  assert.equal(edited.status, 200);

  const published = await createAdminToolsResponse(
    db,
    adminRequest("/api/admin/tools", "PATCH", {
      id: createdBody.tool.id,
      action: "publish",
    }),
    ADMIN_USER_ID,
  );
  assert.equal(published.status, 200);
  const publicTools = await listPublishedTools(db);
  assert.equal(publicTools.length, 1);
  assert.equal(publicTools[0]?.name, "AI Research Notebook");
  assert.deepEqual(publicTools[0]?.categories, ["productivity"]);
  assert.deepEqual(publicTools[0]?.scenes, ["research"]);

  const archived = await createAdminToolsResponse(
    db,
    adminRequest("/api/admin/tools", "PATCH", {
      id: createdBody.tool.id,
      action: "archive",
    }),
    ADMIN_USER_ID,
  );
  assert.equal(archived.status, 200);
  assert.deepEqual(await listPublishedTools(db), []);

  const audits = await db
    .prepare(
      "SELECT action, resource_type AS resourceType, resource_id AS resourceId FROM admin_audit_events ORDER BY id",
    )
    .all<{ action: string; resourceType: string; resourceId: number }>();
  assert.deepEqual(audits.results, [
    { action: "tool.create_draft", resourceType: "tool", resourceId: createdBody.tool.id },
    { action: "tool.edit", resourceType: "tool", resourceId: createdBody.tool.id },
    { action: "tool.publish", resourceType: "tool", resourceId: createdBody.tool.id },
    { action: "tool.archive", resourceType: "tool", resourceId: createdBody.tool.id },
  ]);
});

test("admin tools reject taxonomy slugs that do not exist instead of silently dropping them", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());

  const response = await createAdminToolsResponse(
    db,
    adminRequest("/api/admin/tools", "POST", {
      ...completeTool,
      categorySlugs: ["no-such-category"],
    }),
    ADMIN_USER_ID,
  );

  assert.equal(response.status, 422);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS count FROM tools").first<{ count: number }>())?.count,
    0,
  );
});

test("publishing rejects a legacy draft whose required editorial fields are incomplete", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());
  await db.batch([
    db.prepare(`
      INSERT INTO tools (
        id, slug, name, description, website_url, pricing, tags, verified_at,
        editorial_note, platforms, languages, status
      ) VALUES (9, 'legacy-draft', '', '', '', '', '[]', '', '', '[]', '[]', 'draft')
    `),
    db.prepare("INSERT INTO tool_categories (tool_id, category_id) VALUES (9, 1)"),
  ]);

  const response = await createAdminToolsResponse(
    db,
    adminRequest("/api/admin/tools", "PATCH", { id: 9, action: "publish" }),
    ADMIN_USER_ID,
  );

  assert.equal(response.status, 422);
  assert.deepEqual(await listPublishedTools(db), []);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS count FROM admin_audit_events").first<{ count: number }>())?.count,
    0,
  );
});

test("submission review supports approval and rejection and records both decisions", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());
  await db.batch([
    db.prepare(
      "INSERT INTO submissions (id, type, tool_name, website_url, message) VALUES (1, 'recommendation', 'Tool A', 'https://a.example/', 'Please review A')",
    ),
    db.prepare(
      "INSERT INTO submissions (id, type, tool_name, website_url, message) VALUES (2, 'correction', 'Tool B', 'https://b.example/', 'Please review B')",
    ),
  ]);

  const approved = await createAdminSubmissionsResponse(
    db,
    adminRequest("/api/admin/submissions", "PATCH", {
      id: 1,
      decision: "approved",
      reviewNote: "资料可信，纳入后续编辑。",
    }),
    ADMIN_USER_ID,
  );
  const rejected = await createAdminSubmissionsResponse(
    db,
    adminRequest("/api/admin/submissions", "PATCH", {
      id: 2,
      decision: "rejected",
      reviewNote: "无法核验来源。",
    }),
    ADMIN_USER_ID,
  );

  assert.equal(approved.status, 200);
  assert.equal(rejected.status, 200);
  const submissions = await db
    .prepare(
      "SELECT id, status, review_note AS reviewNote, reviewed_at AS reviewedAt FROM submissions ORDER BY id",
    )
    .all<{ id: number; status: string; reviewNote: string; reviewedAt: string | null }>();
  assert.deepEqual(
    submissions.results.map(({ id, status, reviewNote }) => ({ id, status, reviewNote })),
    [
      { id: 1, status: "approved", reviewNote: "资料可信，纳入后续编辑。" },
      { id: 2, status: "rejected", reviewNote: "无法核验来源。" },
    ],
  );
  assert.ok(submissions.results.every(({ reviewedAt }) => reviewedAt));

  const audits = await db
    .prepare("SELECT action, resource_id AS resourceId FROM admin_audit_events ORDER BY id")
    .all<{ action: string; resourceId: number }>();
  assert.deepEqual(audits.results, [
    { action: "submission.approve", resourceId: 1 },
    { action: "submission.reject", resourceId: 2 },
  ]);
});

test("only the pending-to-reviewed transition writes a submission audit event", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());
  await db.prepare(
    "INSERT INTO submissions (id, type, tool_name, website_url, message) VALUES (3, 'recommendation', 'Tool C', 'https://c.example/', 'Please review C')",
  ).run();

  await db.prepare("UPDATE submissions SET status = 'approved' WHERE id = 3 AND status = 'pending'").run();
  await db.prepare("UPDATE submissions SET status = 'rejected' WHERE id = 3 AND status = 'pending'").run();

  const audits = await db
    .prepare("SELECT action, resource_id AS resourceId FROM admin_audit_events WHERE resource_id = 3")
    .all<{ action: string; resourceId: number }>();
  assert.deepEqual(audits.results, [{ action: "submission.approve", resourceId: 3 }]);
});

test("admin views expose editorial tools and review actions without user management", () => {
  const home = renderToStaticMarkup(
    <AdminHomeView toolCount={12} pendingSubmissionCount={3} />,
  );
  const tools = renderToStaticMarkup(
    <AdminToolsView
      tools={[
        {
          id: 7,
          ...completeTool,
          status: "draft",
          categories: ["productivity"],
          scenes: ["research"],
        },
      ]}
      categories={[{ slug: "productivity", name: "效率工具" }]}
      scenes={[{ slug: "research", name: "研究分析" }]}
    />,
  );
  const submissions = renderToStaticMarkup(
    <AdminSubmissionsView
      submissions={[
        {
          id: 1,
          type: "recommendation",
          toolName: "Tool A",
          websiteUrl: "https://a.example/",
          message: "Please review A",
          email: null,
          status: "pending",
          reviewNote: null,
          createdAt: "2026-08-31 12:00:00",
          reviewedAt: null,
        },
      ]}
    />,
  );

  assert.match(home, /href="\/admin\/tools"/);
  assert.match(home, /href="\/admin\/submissions"/);
  assert.match(tools, /<form[^>]+action="\/api\/admin\/tools"/);
  assert.match(tools, /name="slug"/);
  assert.match(tools, /AI Notebook/);
  assert.match(submissions, /Tool A/);
  assert.match(submissions, /value="approved"/);
  assert.match(submissions, /value="rejected"/);
  assert.doesNotMatch(`${home}${tools}${submissions}`, /用户管理|角色管理/);
});
