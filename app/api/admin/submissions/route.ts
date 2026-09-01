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

  const current = await db
    .prepare("SELECT id, status FROM submissions WHERE id = ?")
    .bind(parsed.data.id)
    .first<{ id: number; status: string }>();
  if (!current) return jsonError("投稿不存在", 404);
  if (current.status !== "pending") return jsonError("该投稿已经处理", 409);

  const action = parsed.data.decision === "approved"
    ? "submission.approve"
    : "submission.reject";
  await db.batch([
    db.prepare(`
      UPDATE submissions
      SET status = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'pending'
    `).bind(parsed.data.decision, parsed.data.reviewNote, parsed.data.id),
    db.prepare(`
      INSERT INTO admin_audit_events (action, resource_type, resource_id)
      VALUES (?, 'submission', ?)
    `).bind(action, parsed.data.id),
  ]);

  return Response.json(
    { submission: { id: parsed.data.id, status: parsed.data.decision } },
    { headers: responseHeaders },
  );
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: responseHeaders });
}

export async function PATCH(request: Request) {
  const { env } = await import("cloudflare:workers");
  return createAdminSubmissionsResponse(env.DB, request);
}
