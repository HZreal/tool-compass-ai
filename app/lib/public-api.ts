import { listPublishedToolPage, type CatalogFilters, type D1Database } from "./catalog";
import { isValidSearchQuery, searchPublishedTools } from "./search";

function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: { "Cache-Control": "public, max-age=300", ...init.headers },
  });
}

export async function createToolsResponse(db: D1Database, request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim();
  if (query && !isValidSearchQuery(query)) {
    return json({ error: "q must contain 2 to 80 characters" }, { status: 400 });
  }
  const region = params.get("region");
  const platform = params.get("platform");
  const pricing = params.get("pricing");
  const filters: CatalogFilters = {
    category: params.get("category") || undefined,
    scene: params.get("scene") || undefined,
    query: query || undefined,
    featured: params.get("featured") === "true",
    region: region === "domestic" || region === "overseas" ? region : undefined,
    platform: platform === "web" || platform === "desktop" || platform === "mobile" || platform === "api" ? platform : undefined,
    pricing: pricing === "free" || pricing === "paid" ? pricing : undefined,
    page: Number.parseInt(params.get("page") ?? "1", 10),
  };
  return json(await listPublishedToolPage(db, filters));
}

export async function createSearchResponse(db: D1Database, request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  if (!isValidSearchQuery(query)) {
    return json({ error: "q must contain 2 to 80 characters" }, { status: 400 });
  }
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  return json(await searchPublishedTools(db, query, page));
}
