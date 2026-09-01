import type { CatalogTool, D1Database } from "./catalog";

export const SEARCH_PAGE_SIZE = 18;

export type SearchSceneSuggestion = { slug: string; name: string; description: string };
export type SearchResult = {
  tools: CatalogTool[];
  total: number;
  page: number;
  totalPages: number;
  suggestedScenes: SearchSceneSuggestion[];
};

type SearchRow = {
  kind: "meta" | "tool" | "scene";
  total: number;
  sortOrder: number;
  slug: string;
  name: string;
  description: string;
  websiteUrl: string | null;
  pricing: string | null;
  tags: string | null;
  verifiedAt: string | null;
  editorialNote: string | null;
  platforms: string | null;
  languages: string | null;
  status: "published" | null;
  featured: number | null;
  categories: string | null;
  scenes: string | null;
};

export function isValidSearchQuery(query: string): boolean {
  return query.length >= 2 && query.length <= 80;
}

export function toFtsPhrase(query: string): string {
  return `"${query.trim().replaceAll('"', '""')}"`;
}

export async function searchPublishedTools(db: D1Database, query: string, page = 1): Promise<SearchResult> {
  const currentPage = Math.max(1, Math.min(100, Math.floor(page) || 1));
  const offset = (currentPage - 1) * SEARCH_PAGE_SIZE;
  const ftsQuery = toFtsPhrase(query);
  const result = await db.prepare(`
    WITH matched AS (
      SELECT t.id, COUNT(*) OVER() AS total
      FROM tools_fts
      JOIN tools t ON t.id = tools_fts.rowid
      WHERE tools_fts MATCH ? AND t.status = 'published'
    ), paginated AS (
      SELECT id, total FROM matched
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    ), tool_rows AS (
      SELECT 'tool' AS kind, p.total, 0 AS sortOrder, t.slug, t.name, t.description,
        t.website_url AS websiteUrl, t.pricing, t.tags, t.verified_at AS verifiedAt,
        t.editorial_note AS editorialNote, t.platforms, t.languages, t.status, t.featured,
        GROUP_CONCAT(DISTINCT c.slug) AS categories,
        GROUP_CONCAT(DISTINCT s.slug) AS scenes
      FROM paginated p
      JOIN tools t ON t.id = p.id
      LEFT JOIN tool_categories tc ON tc.tool_id = t.id
      LEFT JOIN categories c ON c.id = tc.category_id
      LEFT JOIN tool_scenes ts ON ts.tool_id = t.id
      LEFT JOIN scenes s ON s.id = ts.scene_id
      GROUP BY p.id
    )
    SELECT kind, total, sortOrder, slug, name, description, websiteUrl, pricing, tags, verifiedAt, editorialNote, platforms, languages, status, featured, categories, scenes FROM tool_rows
    UNION ALL
    SELECT 'meta' AS kind, total, 0 AS sortOrder, '', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    FROM (SELECT COUNT(*) AS total FROM matched)
    UNION ALL
    SELECT 'scene' AS kind, 0 AS total, sort_order AS sortOrder, slug, name, description, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
    FROM scenes
    WHERE NOT EXISTS (SELECT 1 FROM matched)
    ORDER BY kind ASC, sort_order ASC, name COLLATE NOCASE ASC
  `).bind(ftsQuery, SEARCH_PAGE_SIZE, offset).all<SearchRow>();

  const toolRows = result.results.filter((row) => row.kind === "tool");
  const suggestions = result.results
    .filter((row) => row.kind === "scene")
    .map(({ slug, name, description }) => ({ slug, name, description }));
  const total = result.results.find((row) => row.kind === "meta")?.total ?? 0;

  return {
    tools: toolRows.map((row) => ({
      slug: row.slug,
      name: row.name,
      description: row.description,
      websiteUrl: row.websiteUrl!,
      pricing: row.pricing!,
      tags: parseStringArray(row.tags!),
      verifiedAt: row.verifiedAt!,
      editorialNote: row.editorialNote!,
      platforms: parseStringArray(row.platforms!),
      languages: parseStringArray(row.languages!),
      status: "published",
      featured: Boolean(row.featured),
      categories: row.categories?.split(",") ?? [],
      scenes: row.scenes?.split(",") ?? [],
    })),
    total,
    page: currentPage,
    totalPages: Math.ceil(total / SEARCH_PAGE_SIZE),
    suggestedScenes: suggestions,
  };
}

function parseStringArray(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
}
