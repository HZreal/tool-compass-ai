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
import { listAdminTools } from "../../app/lib/admin-data";

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
      "0005_catalog_contract.sql",
      "0006_structured_pricing.sql", "0008_tool_sources.sql",
      "0007_admin_taxonomy.sql",
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

test("admin tool metadata round-trips region, aliases, logo and sources on create and edit", async (t) => {
  const { db, miniflare } = await createDatabase(); t.after(() => miniflare.dispose());
  const metadata = { region: "domestic", aliases: ["研究助手", "Research Helper"], logoUrl: "https://example.com/logo.png", sources: ["https://example.com/docs", "https://example.com/pricing"] };
  const created = await createAdminToolsResponse(db, adminRequest("/api/admin/tools", "POST", { ...completeTool, ...metadata }), ADMIN_USER_ID);
  assert.equal(created.status, 201);
  const { tool } = await created.json() as { tool: { id: number } };
  const saved = (await listAdminTools(db))[0];
  for (const [key, value] of Object.entries(metadata)) assert.deepEqual(saved[key as keyof typeof saved], value);
  const changed = { ...metadata, region: "overseas", aliases: ["Changed alias"], logoUrl: "", sources: ["https://example.com/about"] };
  assert.equal((await createAdminToolsResponse(db, adminRequest("/api/admin/tools", "PATCH", { id: tool.id, action: "edit", tool: { ...completeTool, ...changed } }), ADMIN_USER_ID)).status, 200);
  const edited = (await listAdminTools(db))[0];
  assert.equal(edited.region, "overseas");
  assert.deepEqual(edited.aliases, ["Changed alias"]);
  assert.equal(edited.logoUrl, null);
  assert.deepEqual(edited.sources, ["https://example.com/about"]);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM tools_fts WHERE tools_fts MATCH 'Changed'").first<{ n: number }>())?.n, 1);
});

test("admin tool URLs reject non-HTTPS and credentials for website, logo and sources", async (t) => {
  const { db, miniflare } = await createDatabase(); t.after(() => miniflare.dispose());
  for (const url of ["http://example.com", "javascript:alert(1)", "https://user:secret@example.com", "https://user@example.com"]) {
    for (const field of ["websiteUrl", "logoUrl", "sources"]) {
      const response = await createAdminToolsResponse(db, adminRequest("/api/admin/tools", "POST", { ...completeTool, [field]: field === "sources" ? [url] : url }), ADMIN_USER_ID);
      assert.equal(response.status, 400, `${field}: ${url}`);
    }
  }
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM tools").first<{ n: number }>())?.n, 0);
});

test("incomplete drafts can be saved but cannot be published", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());
  const created = await createAdminToolsResponse(db, adminRequest("/api/admin/tools", "POST", {
    slug: "incomplete", name: "Incomplete",
  }), ADMIN_USER_ID);
  assert.equal(created.status, 201);
  const body = await created.json() as { tool: { id: number } };
  const published = await createAdminToolsResponse(db, adminRequest("/api/admin/tools", "PATCH", {
    id: body.tool.id, action: "publish",
  }), ADMIN_USER_ID);
  assert.equal(published.status, 422);
  assert.equal(published.headers.get("cache-control"), "no-store");
});

test("conversion creates exactly one private draft and links the submission", async (t) => {
  const { db, miniflare } = await createDatabase();
  t.after(() => miniflare.dispose());
  await db.prepare("INSERT INTO submissions (id,type,tool_name,website_url,message) VALUES (99,'recommendation','New tool','https://example.com/','Worth reviewing')").run();
  const responses = await Promise.all([1, 2].map(() => createAdminSubmissionsResponse(db,
    adminRequest("/api/admin/submissions", "PATCH", { id: 99, decision: "convert", reviewNote: "Create draft for verification" }), ADMIN_USER_ID)));
  assert.ok(responses.every((response) => response.status === 200));
  const bodies = await Promise.all(responses.map((response) => response.json())) as { submission: { convertedToolId: number } }[];
  assert.equal(bodies[0].submission.convertedToolId, bodies[1].submission.convertedToolId);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM tools").first<{ n: number }>())?.n, 1);
  assert.equal((await db.prepare("SELECT status FROM tools").first<{ status: string }>())?.status, "draft");
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM admin_audit_events WHERE action = 'submission.convert'").first<{ n: number }>())?.n, 1);
});

test("published tools retain complete category and scene data and structured pricing/rank", async (t) => {
  const { db, miniflare } = await createDatabase(); t.after(() => miniflare.dispose());
  const payload = { ...completeTool, pricingModel: "usage_based", featured: true, featuredRank: 2 };
  const created = await createAdminToolsResponse(db, adminRequest("/api/admin/tools", "POST", payload), ADMIN_USER_ID);
  const { tool } = await created.json() as { tool: { id: number } };
  const stored = await db.prepare("SELECT pricing_model, featured_rank FROM tools WHERE id=?").bind(tool.id).first();
  assert.deepEqual(stored, { pricing_model: "usage_based", featured_rank: 2 });
  assert.equal((await createAdminToolsResponse(db, adminRequest("/api/admin/tools", "PATCH", { id: tool.id, action: "publish" }), ADMIN_USER_ID)).status, 200);
  for (const incomplete of [{ ...payload, categorySlugs: [] }, { ...payload, sceneSlugs: [] }, { ...payload, description: "" }]) {
    assert.equal((await createAdminToolsResponse(db, adminRequest("/api/admin/tools", "PATCH", { id: tool.id, action: "edit", tool: incomplete }), ADMIN_USER_ID)).status, 422);
  }
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM tool_scenes WHERE tool_id=?").bind(tool.id).first<{ n: number }>())?.n, 1);
});

test("conversion rolls back the draft and review when audit insertion fails", async (t) => {
  const { db, miniflare } = await createDatabase(); t.after(() => miniflare.dispose());
  await db.prepare("INSERT INTO submissions (id,type,tool_name,website_url,message) VALUES (98,'recommendation','New tool','https://example.com/','Worth reviewing')").run();
  await db.prepare("CREATE TRIGGER fail_conversion_audit BEFORE INSERT ON admin_audit_events WHEN NEW.action='submission.convert' BEGIN SELECT RAISE(ABORT, 'forced audit failure'); END").run();
  const response = await createAdminSubmissionsResponse(db, adminRequest("/api/admin/submissions", "PATCH", { id: 98, decision: "convert", reviewNote: "Create draft" }), ADMIN_USER_ID);
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM tools").first<{ n: number }>())?.n, 0);
  assert.equal((await db.prepare("SELECT status FROM submissions WHERE id=98").first<{ status: string }>())?.status, "pending");
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM admin_audit_events").first<{ n: number }>())?.n, 0);
});

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
  assert.match(tools, /name="pricingModel"/);
  assert.match(tools, /name="featuredRank"/);
  assert.match(tools, /name="region"/);
  assert.match(tools, /name="aliases"/);
  assert.match(tools, /name="logoUrl"/);
  assert.match(tools, /name="sources"/);
  assert.match(home, /href="\/admin\/taxonomy"/);
  assert.match(home, /href="\/admin\/operations"/);
  assert.match(tools, /AI Notebook/);
  assert.match(submissions, /Tool A/);
  assert.match(submissions, /value="approved"/);
  assert.match(submissions, /value="rejected"/);
  assert.match(submissions, /value="convert"/);
  assert.doesNotMatch(`${home}${tools}${submissions}`, /用户管理|角色管理/);
});
