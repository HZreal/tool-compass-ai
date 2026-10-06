import { z } from "zod";
import { adminAuthErrorResponse, authorizeAdminRequest, requireAdmin } from "../../../lib/admin-auth";
import type { D1Database } from "../../../lib/catalog";
import { listAdminTaxonomy, taxonomyKinds } from "../../../lib/taxonomy";

const headers = { "cache-control": "no-store" };
const identity = z.object({ kind: z.enum(taxonomyKinds), id: z.number().int().positive() });
const fields = z.object({
  kind: z.enum(taxonomyKinds),
  slug: z.string().trim().min(1).max(500).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能包含小写字母、数字和连字符"),
  name: z.string().trim().min(1, "请填写名称").max(80),
  description: z.string().trim().max(1000).default(""),
  sortOrder: z.number().int().min(-1_000_000).max(1_000_000).default(0),
});
const edit = fields.extend({ id: z.number().int().positive() });
const errorResponse = (error: string, status: number) => Response.json({ error }, { status, headers });

export async function createAdminTaxonomyResponse(db: D1Database, request: Request, adminUserId?: string): Promise<Response> {
  try {
    if (adminUserId === undefined) await requireAdmin(request);
    else authorizeAdminRequest(request, adminUserId);
  } catch (error) {
    const response = adminAuthErrorResponse(error);
    if (response) return response;
    throw error;
  }
  if (request.method === "GET") {
    try { return Response.json(await listAdminTaxonomy(db), { headers }); }
    catch { return errorResponse("目录加载失败，请重试", 500); }
  }
  if (!["POST", "PATCH", "DELETE"].includes(request.method)) return errorResponse("不支持的请求方法", 405);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("请求格式必须为 JSON", 400); }
  try {
    if (request.method === "DELETE") {
      const parsed = identity.safeParse(body);
      if (!parsed.success) return errorResponse("分类类型或编号无效", 400);
      const { kind, id } = parsed.data;
      if (!await db.prepare(`SELECT id FROM ${kind} WHERE id = ?`).bind(id).first()) return errorResponse("条目不存在", 404);
      await db.batch([
        db.prepare("INSERT INTO admin_audit_events(action, resource_type, resource_id) VALUES (?, ?, ?)").bind(`${kind}.delete`, kind, id),
        db.prepare(`DELETE FROM ${kind} WHERE id = ?`).bind(id),
      ]);
      return Response.json({ deleted: id }, { headers });
    }
    const parsed = (request.method === "POST" ? fields : edit).safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message ?? "条目无效", 400);
    const item = parsed.data;
    const itemId = "id" in item ? Number(item.id) : null;
    if (itemId !== null && !await db.prepare(`SELECT id FROM ${item.kind} WHERE id = ?`).bind(itemId).first()) return errorResponse("条目不存在", 404);
    const statement = itemId === null
      ? db.prepare(`INSERT INTO ${item.kind}(slug, name, description, sort_order) VALUES (?, ?, ?, ?)`).bind(item.slug, item.name, item.description, item.sortOrder)
      : db.prepare(`UPDATE ${item.kind} SET slug = ?, name = ?, description = ?, sort_order = ? WHERE id = ?`).bind(item.slug, item.name, item.description, item.sortOrder, itemId);
    await db.batch([
      statement,
      db.prepare(`INSERT INTO admin_audit_events(action, resource_type, resource_id) SELECT ?, ?, id FROM ${item.kind} WHERE slug = ?`).bind(`${item.kind}.${itemId === null ? "create" : "edit"}`, item.kind, item.slug),
    ]);
    const saved = await db.prepare(`SELECT id, slug, name, description, sort_order AS sortOrder FROM ${item.kind} WHERE slug = ?`).bind(item.slug).first();
    return Response.json({ item: saved }, { status: itemId === null ? 201 : 200, headers });
  } catch (error) {
    if (String(error).includes("taxonomy_in_use")) return errorResponse("条目仍被工具引用，请先调整工具的分类或场景", 409);
    if (String(error).includes("UNIQUE constraint")) return errorResponse("slug 或标签名称已存在", 409);
    return errorResponse("保存失败，未保存任何变更，请重试", 500);
  }
}

async function handle(request: Request) {
  const { env } = await import("cloudflare:workers");
  return createAdminTaxonomyResponse(env.DB, request);
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
