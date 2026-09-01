import type { D1Database } from "../../lib/catalog";

type OutboundTool = { id: number; websiteUrl: string };

function getSourcePath(request: Request): string {
  const referer = request.headers.get("referer");
  if (!referer) return "/";
  try {
    const source = new URL(referer);
    return source.origin === new URL(request.url).origin ? source.pathname : "/";
  } catch {
    return "/";
  }
}

export async function createOutboundRedirectResponse(db: D1Database, request: Request, slug: string): Promise<Response> {
  const tool = await db.prepare(`
    SELECT id, website_url AS websiteUrl
    FROM tools
    WHERE slug = ? AND status = 'published'
  `).bind(slug).first<OutboundTool>();
  if (!tool) return new Response(null, { status: 404 });

  await db.prepare("INSERT INTO outbound_events (tool_id, source_path) VALUES (?, ?)")
    .bind(tool.id, getSourcePath(request)).run();
  return new Response(null, { status: 302, headers: { location: tool.websiteUrl, "cache-control": "no-store" } });
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { env } = await import("cloudflare:workers");
  const { slug } = await params;
  return createOutboundRedirectResponse(env.DB, request, slug);
}
