import type { D1Database } from "../../../lib/catalog";
import {
  adminAuthErrorResponse,
  authorizeAdminRequest,
  requireAdmin,
} from "../../../lib/admin-auth";
import { adminSubmissionReviewSchema } from "../../../lib/validation";

const responseHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

export async function createAdminSubmissionsResponse(
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
  if (request.method !== "PATCH") return jsonError("不支持的请求方法", 405);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("请求格式必须为 JSON", 400);
  }
  const parsed = adminSubmissionReviewSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "审核内容无效", 400);
  }

  try {
  const current = await db
    .prepare("SELECT id, status, type, converted_tool_id AS convertedToolId FROM submissions WHERE id = ?")
    .bind(parsed.data.id)
    .first<{ id: number; status: string; type: string; convertedToolId: number | null }>();
  if (!current) return jsonError("投稿不存在", 404);
  if (parsed.data.decision === "convert") {
    if (current.convertedToolId) return Response.json({ submission: current }, { headers: responseHeaders });
    if (current.type !== "recommendation") return jsonError("纠错投稿不能转换为新工具", 422);
    if (current.status !== "pending") return jsonError("该投稿已经处理", 409);
    try {
      // D1 batch is atomic. Each statement repeats the claim predicate so a
      // concurrent request cannot create another tool or overwrite the winner.
      await db.batch([
        db.prepare(`INSERT INTO tools (slug, name, description, website_url, pricing, tags, verified_at, editorial_note, platforms, languages, status)
          SELECT 'submission-' || id, tool_name, '', website_url, '', '[]', '', substr(message, 1, 1000), '[]', '[]', 'draft'
          FROM submissions WHERE id = ? AND status = 'pending' AND converted_tool_id IS NULL`).bind(current.id),
        db.prepare(`UPDATE submissions SET status = 'approved', review_note = ?, reviewed_at = CURRENT_TIMESTAMP,
          converted_tool_id = (SELECT id FROM tools WHERE slug = 'submission-' || submissions.id)
          WHERE id = ? AND status = 'pending' AND converted_tool_id IS NULL`).bind(parsed.data.reviewNote, current.id),
      ]);
    } catch (error) {
      if (String(error).includes("UNIQUE constraint")) return jsonError("自动草稿 slug 已被占用，请先调整同名工具", 409);
      return jsonError("转换失败，未保存任何变更，请重试", 500);
    }
    const converted = await db.prepare("SELECT id, status, converted_tool_id AS convertedToolId FROM submissions WHERE id = ?").bind(current.id).first<{ id: number; status: string; convertedToolId: number | null }>();
    if (!converted?.convertedToolId) return jsonError("该投稿已经处理", 409);
    return Response.json({ submission: converted }, { headers: responseHeaders });
  }
  if (current.status !== "pending") return jsonError("该投稿已经处理", 409);

  const updated = await db.prepare(`
    UPDATE submissions
    SET status = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'pending'
  `).bind(parsed.data.decision, parsed.data.reviewNote, parsed.data.id).run();
  if (updated.meta.changes === 0) return jsonError("该投稿已经处理", 409);

  return Response.json(
    { submission: { id: parsed.data.id, status: parsed.data.decision } },
    { headers: responseHeaders },
  );
  } catch {
    return jsonError("审核失败，请重试", 500);
  }
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: responseHeaders });
}

export async function PATCH(request: Request) {
  const { env } = await import("cloudflare:workers");
  return createAdminSubmissionsResponse(env.DB, request);
}
