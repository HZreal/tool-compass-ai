import type { D1Database } from "../../lib/catalog";
import { submissionSchema } from "../../lib/validation";

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export async function createSubmissionResponse(db: D1Database, request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "请求格式必须为 JSON" }, { status: 400, headers: jsonHeaders });
  }

  const parsed = submissionSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "投稿内容无效" }, { status: 400, headers: jsonHeaders });
  }

  const { company, type, toolName, websiteUrl, message, email } = parsed.data;
  if (company) return Response.json({ ok: true }, { status: 201, headers: jsonHeaders });

  await db.prepare(`
    INSERT INTO submissions (type, tool_name, website_url, message, email)
    VALUES (?, ?, ?, ?, ?)
  `).bind(type, toolName, websiteUrl, message, email ?? null).run();
  return Response.json({ ok: true }, { status: 201, headers: jsonHeaders });
}

export async function POST(request: Request) {
  const { env } = await import("cloudflare:workers");
  return createSubmissionResponse(env.DB, request);
}
