import type { D1Database, D1PreparedStatement } from "../../../lib/catalog";
import {
  adminAuthErrorResponse,
  authorizeAdminRequest,
  requireAdmin,
} from "../../../lib/admin-auth";
import {
  adminToolMutationSchema,
  adminToolSchema,
  type AdminToolInput,
} from "../../../lib/validation";

const responseHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

export async function createAdminToolsResponse(
  db: D1Database,
  request: Request,
  adminUserId?: string,
): Promise<Response> {
  try {
    if (adminUserId === undefined) await requireAdmin(request);
    else authorizeAdminRequest(request, adminUserId);
  } catch (error) {
    const response = adminAuthErrorResponse(error);
    if (response) return response;
    throw error;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("请求格式必须为 JSON", 400);
  }

  if (request.method === "POST") {
    const parsed = adminToolSchema.safeParse(payload);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message);
    return createDraft(db, parsed.data);
  }

  if (request.method === "PATCH") {
    const parsed = adminToolMutationSchema.safeParse(payload);
    if (!parsed.success) return validationError(parsed.error.issues[0]?.message);

    if (parsed.data.action === "edit") {
      return editTool(db, parsed.data.id, parsed.data.tool);
    }
    return setToolStatus(db, parsed.data.id, parsed.data.action);
  }

  return jsonError("不支持的请求方法", 405);
}

async function createDraft(db: D1Database, tool: AdminToolInput): Promise<Response> {
  const taxonomyError = await validateTaxonomy(db, tool);
  if (taxonomyError) return jsonError(taxonomyError, 422);

  const existing = await db
    .prepare("SELECT id FROM tools WHERE slug = ?")
    .bind(tool.slug)
    .first<{ id: number }>();
  if (existing) return jsonError("该 slug 已存在", 409);

  const statements: D1PreparedStatement[] = [
    db.prepare(`
      INSERT INTO tools (
        slug, name, description, website_url, pricing, tags, verified_at,
        editorial_note, platforms, languages, status, featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `).bind(...toolValues(tool)),
    ...relationStatements(db, tool),
    db.prepare(`
      INSERT INTO admin_audit_events (action, resource_type, resource_id)
      SELECT 'tool.create_draft', 'tool', id FROM tools WHERE slug = ?
    `).bind(tool.slug),
  ];
  await db.batch(statements);

  const created = await db
    .prepare("SELECT id, slug, status FROM tools WHERE slug = ?")
    .bind(tool.slug)
    .first<{ id: number; slug: string; status: string }>();
  return Response.json({ tool: created }, { status: 201, headers: responseHeaders });
}

async function editTool(
  db: D1Database,
  id: number,
  tool: AdminToolInput,
): Promise<Response> {
  const taxonomyError = await validateTaxonomy(db, tool);
  if (taxonomyError) return jsonError(taxonomyError, 422);

  const current = await db
    .prepare("SELECT id FROM tools WHERE id = ?")
    .bind(id)
    .first<{ id: number }>();
  if (!current) return jsonError("工具不存在", 404);

  const duplicate = await db
    .prepare("SELECT id FROM tools WHERE slug = ? AND id != ?")
    .bind(tool.slug, id)
    .first<{ id: number }>();
  if (duplicate) return jsonError("该 slug 已存在", 409);

  await db.batch([
    db.prepare(`
      UPDATE tools SET
        slug = ?, name = ?, description = ?, website_url = ?, pricing = ?,
        tags = ?, verified_at = ?, editorial_note = ?, platforms = ?, languages = ?,
        featured = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(...toolValues(tool), id),
    db.prepare("DELETE FROM tool_categories WHERE tool_id = ?").bind(id),
    db.prepare("DELETE FROM tool_scenes WHERE tool_id = ?").bind(id),
    ...relationStatements(db, tool, id),
    auditStatement(db, "tool.edit", "tool", id),
  ]);

  return Response.json(
    { tool: { id, slug: tool.slug, status: "updated" } },
    { headers: responseHeaders },
  );
}

async function setToolStatus(
  db: D1Database,
  id: number,
  action: "publish" | "archive",
): Promise<Response> {
  const tool = await db.prepare(`
    SELECT
      t.id, t.slug, t.name, t.description, t.website_url AS websiteUrl,
      t.pricing, t.tags, t.verified_at AS verifiedAt,
      t.editorial_note AS editorialNote, t.platforms, t.languages, t.featured,
      GROUP_CONCAT(DISTINCT c.slug) AS categorySlugs,
      GROUP_CONCAT(DISTINCT s.slug) AS sceneSlugs
    FROM tools t
    LEFT JOIN tool_categories tc ON tc.tool_id = t.id
    LEFT JOIN categories c ON c.id = tc.category_id
    LEFT JOIN tool_scenes ts ON ts.tool_id = t.id
    LEFT JOIN scenes s ON s.id = ts.scene_id
    WHERE t.id = ?
    GROUP BY t.id
  `).bind(id).first<PublicationCandidateRow>();
  if (!tool) return jsonError("工具不存在", 404);
  if (action === "publish") {
    const publishable = adminToolSchema.safeParse({
      ...tool,
      tags: parseStoredList(tool.tags),
      platforms: parseStoredList(tool.platforms),
      languages: parseStoredList(tool.languages),
      featured: Boolean(tool.featured),
      categorySlugs: tool.categorySlugs?.split(",") ?? [],
      sceneSlugs: tool.sceneSlugs?.split(",") ?? [],
    });
    if (!publishable.success) {
      return jsonError(
        `发布前请补全资料：${publishable.error.issues[0]?.message ?? "内容无效"}`,
        422,
      );
    }
  }

  const status = action === "publish" ? "published" : "archived";
  await db.batch([
    db.prepare("UPDATE tools SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(status, id),
    auditStatement(db, `tool.${action}`, "tool", id),
  ]);

  return Response.json({ tool: { id, status } }, { headers: responseHeaders });
}

type PublicationCandidateRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  websiteUrl: string;
  pricing: string;
  tags: string;
  verifiedAt: string;
  editorialNote: string;
  platforms: string;
  languages: string;
  featured: number;
  categorySlugs: string | null;
  sceneSlugs: string | null;
};

function parseStoredList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function toolValues(tool: AdminToolInput): unknown[] {
  return [
    tool.slug,
    tool.name,
    tool.description,
    tool.websiteUrl,
    tool.pricing,
    JSON.stringify(tool.tags),
    tool.verifiedAt,
    tool.editorialNote,
    JSON.stringify(tool.platforms),
    JSON.stringify(tool.languages),
    tool.featured ? 1 : 0,
  ];
}

function relationStatements(
  db: D1Database,
  tool: AdminToolInput,
  toolId?: number,
): D1PreparedStatement[] {
  const toolSelector = toolId === undefined
    ? "(SELECT id FROM tools WHERE slug = ?)"
    : "?";
  const toolSelectorValue = toolId ?? tool.slug;
  return [
    ...new Set(tool.categorySlugs),
  ].map((slug) => db.prepare(`
    INSERT INTO tool_categories (tool_id, category_id)
    SELECT ${toolSelector}, id FROM categories WHERE slug = ?
  `).bind(toolSelectorValue, slug)).concat(
    [...new Set(tool.sceneSlugs)].map((slug) => db.prepare(`
      INSERT INTO tool_scenes (tool_id, scene_id)
      SELECT ${toolSelector}, id FROM scenes WHERE slug = ?
    `).bind(toolSelectorValue, slug)),
  );
}

async function validateTaxonomy(
  db: D1Database,
  tool: AdminToolInput,
): Promise<string | null> {
  if (!await allSlugsExist(db, "categories", tool.categorySlugs)) {
    return "所选分类不存在，请刷新后重试";
  }
  if (!await allSlugsExist(db, "scenes", tool.sceneSlugs)) {
    return "所选场景不存在，请刷新后重试";
  }
  return null;
}

async function allSlugsExist(
  db: D1Database,
  table: "categories" | "scenes",
  slugs: string[],
): Promise<boolean> {
  const uniqueSlugs = [...new Set(slugs)];
  if (uniqueSlugs.length === 0) return true;
  const placeholders = uniqueSlugs.map(() => "?").join(", ");
  const rows = await db
    .prepare(`SELECT slug FROM ${table} WHERE slug IN (${placeholders})`)
    .bind(...uniqueSlugs)
    .all<{ slug: string }>();
  return new Set(rows.results.map((row) => row.slug)).size === uniqueSlugs.length;
}

function auditStatement(
  db: D1Database,
  action: string,
  resourceType: string,
  resourceId: number,
): D1PreparedStatement {
  return db.prepare(`
    INSERT INTO admin_audit_events (action, resource_type, resource_id)
    VALUES (?, ?, ?)
  `).bind(action, resourceType, resourceId);
}

function validationError(message = "工具内容无效") {
  return jsonError(message, 400);
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: responseHeaders });
}

export async function POST(request: Request) {
  const { env } = await import("cloudflare:workers");
  return createAdminToolsResponse(env.DB, request);
}

export async function PATCH(request: Request) {
  const { env } = await import("cloudflare:workers");
  return createAdminToolsResponse(env.DB, request);
}
