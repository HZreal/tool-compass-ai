import type { ToolRegion, ToolStatus } from "../../drizzle/schema";
import { toFtsPhrase } from "./search";

export type D1Result<T> = { results: T[] };

export type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<D1Result<T>>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
};

export type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
};

export type CatalogTool = {
  slug: string;
  name: string;
  aliases: string[];
  description: string;
  websiteUrl: string;
  logoUrl: string | null;
  region: ToolRegion;
  pricing: string;
  tags: string[];
  verifiedAt: string;
  editorialNote: string;
  platforms: string[];
  languages: string[];
  status: ToolStatus;
  featured: boolean;
  featuredRank: number | null;
  categories: string[];
  scenes: string[];
};

export type CatalogFilters = {
  category?: string;
  scene?: string;
  query?: string;
  featured?: boolean;
  region?: ToolRegion;
  platform?: "web" | "desktop" | "mobile" | "api";
  pricing?: "free" | "paid";
  page?: number;
};

export const CATALOG_PAGE_SIZE = 18;

export type CatalogPage = {
  tools: CatalogTool[];
  total: number;
  page: number;
  totalPages: number;
};

export type CatalogCategory = {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
};

export type CatalogScene = CatalogCategory;

type CatalogRow = Omit<CatalogTool, "categories" | "scenes" | "aliases" | "tags" | "platforms" | "languages" | "featured"> & {
  featured: number;
  aliases: string;
  categories: string | null;
  scenes: string | null;
  tags: string;
  platforms: string;
  languages: string;
};

const toolFields = `
  t.slug, t.name, t.aliases, t.description, t.website_url AS websiteUrl, t.logo_url AS logoUrl,
  t.region, t.status, t.featured, t.featured_rank AS featuredRank,
  t.pricing, t.tags, t.verified_at AS verifiedAt, t.editorial_note AS editorialNote,
  t.platforms, t.languages,
  GROUP_CONCAT(DISTINCT c.slug) AS categories,
  GROUP_CONCAT(DISTINCT s.slug) AS scenes
`;

function toCatalogTool(row: CatalogRow): CatalogTool {
  return {
    ...row,
    featured: Boolean(row.featured),
    aliases: parseStringArray(row.aliases),
    tags: parseStringArray(row.tags),
    platforms: parseStringArray(row.platforms),
    languages: parseStringArray(row.languages),
    categories: row.categories?.split(",") ?? [],
    scenes: row.scenes?.split(",") ?? [],
  };
}

function parseStringArray(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
}

export async function listCatalogCategories(db: D1Database): Promise<CatalogCategory[]> {
  const result = await db.prepare(`
    SELECT slug, name, description, sort_order AS sortOrder
    FROM categories
    ORDER BY sort_order ASC, name COLLATE NOCASE ASC
  `).bind().all<CatalogCategory>();
  return result.results;
}

export async function listCatalogScenes(db: D1Database): Promise<CatalogScene[]> {
  const result = await db.prepare(`
    SELECT slug, name, description, sort_order AS sortOrder
    FROM scenes
    ORDER BY sort_order ASC, name COLLATE NOCASE ASC
  `).bind().all<CatalogScene>();
  return result.results;
}

export async function getCatalogScene(db: D1Database, slug: string): Promise<CatalogScene | null> {
  const result = await db.prepare(`
    SELECT slug, name, description, sort_order AS sortOrder
    FROM scenes
    WHERE slug = ?
  `).bind(slug).all<CatalogScene>();
  return result.results[0] ?? null;
}

export async function listPublishedTools(
  db: D1Database,
  filters: CatalogFilters = {},
): Promise<CatalogTool[]> {
  const clauses = ["t.status = 'published'"];
  const values: unknown[] = [];

  if (filters.category) {
    clauses.push("EXISTS (SELECT 1 FROM tool_categories tc_filter JOIN categories c_filter ON c_filter.id = tc_filter.category_id WHERE tc_filter.tool_id = t.id AND c_filter.slug = ?)");
    values.push(filters.category);
  }
  if (filters.scene) {
    clauses.push("EXISTS (SELECT 1 FROM tool_scenes ts_filter JOIN scenes s_filter ON s_filter.id = ts_filter.scene_id WHERE ts_filter.tool_id = t.id AND s_filter.slug = ?)");
    values.push(filters.scene);
  }
  if (filters.query?.trim()) {
    clauses.push("t.id IN (SELECT rowid FROM tools_fts WHERE tools_fts MATCH ?)");
    values.push(toFtsPhrase(filters.query));
  }
  if (filters.featured) clauses.push("t.featured = 1");

  const result = await db.prepare(`
    SELECT ${toolFields}
    FROM tools t
    LEFT JOIN tool_categories tc ON tc.tool_id = t.id
    LEFT JOIN categories c ON c.id = tc.category_id
    LEFT JOIN tool_scenes ts ON ts.tool_id = t.id
    LEFT JOIN scenes s ON s.id = ts.scene_id
    WHERE ${clauses.join(" AND ")}
    GROUP BY t.id
    ORDER BY t.featured DESC, t.featured_rank ASC NULLS LAST, t.name COLLATE NOCASE ASC
  `).bind(...values).all<CatalogRow>();

  return result.results.map(toCatalogTool);
}

export async function listPublishedToolPage(
  db: D1Database,
  filters: CatalogFilters = {},
): Promise<CatalogPage> {
  const { clauses, values } = buildPublishedToolFilters(filters);
  const page = Math.max(1, Math.min(100, Math.floor(filters.page ?? 1) || 1));
  const offset = (page - 1) * CATALOG_PAGE_SIZE;
  const [countResult, toolResult] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS total FROM tools t WHERE ${clauses.join(" AND ")}`)
      .bind(...values).first<{ total: number }>(),
    db.prepare(`
      SELECT ${toolFields}
      FROM tools t
      LEFT JOIN tool_categories tc ON tc.tool_id = t.id
      LEFT JOIN categories c ON c.id = tc.category_id
      LEFT JOIN tool_scenes ts ON ts.tool_id = t.id
      LEFT JOIN scenes s ON s.id = ts.scene_id
      WHERE ${clauses.join(" AND ")}
      GROUP BY t.id
      ORDER BY t.featured DESC, t.featured_rank ASC NULLS LAST, t.name COLLATE NOCASE ASC
      LIMIT ? OFFSET ?
    `).bind(...values, CATALOG_PAGE_SIZE, offset).all<CatalogRow>(),
  ]);
  const total = countResult?.total ?? 0;
  return { tools: toolResult.results.map(toCatalogTool), total, page, totalPages: Math.ceil(total / CATALOG_PAGE_SIZE) };
}

function buildPublishedToolFilters(filters: CatalogFilters) {
  const clauses = ["t.status = 'published'"];
  const values: unknown[] = [];
  if (filters.category) {
    clauses.push("EXISTS (SELECT 1 FROM tool_categories tc_filter JOIN categories c_filter ON c_filter.id = tc_filter.category_id WHERE tc_filter.tool_id = t.id AND c_filter.slug = ?)");
    values.push(filters.category);
  }
  if (filters.scene) {
    clauses.push("EXISTS (SELECT 1 FROM tool_scenes ts_filter JOIN scenes s_filter ON s_filter.id = ts_filter.scene_id WHERE ts_filter.tool_id = t.id AND s_filter.slug = ?)");
    values.push(filters.scene);
  }
  if (filters.query?.trim()) {
    clauses.push("t.id IN (SELECT rowid FROM tools_fts WHERE tools_fts MATCH ?)");
    values.push(toFtsPhrase(filters.query));
  }
  if (filters.featured) clauses.push("t.featured = 1");
  if (filters.region) { clauses.push("t.region = ?"); values.push(filters.region); }
  if (filters.platform === "web") clauses.push("EXISTS (SELECT 1 FROM json_each(t.platforms) WHERE lower(value) = 'web')");
  if (filters.platform === "api") clauses.push("EXISTS (SELECT 1 FROM json_each(t.platforms) WHERE lower(value) = 'api')");
  if (filters.platform === "desktop") clauses.push("EXISTS (SELECT 1 FROM json_each(t.platforms) WHERE lower(value) IN ('macos', 'windows', 'linux'))");
  if (filters.platform === "mobile") clauses.push("EXISTS (SELECT 1 FROM json_each(t.platforms) WHERE lower(value) IN ('ios', 'android'))");
  if (filters.pricing === "free") clauses.push("(lower(t.pricing) LIKE '%free%' OR lower(t.pricing) LIKE '%open-source%')");
  if (filters.pricing === "paid") clauses.push("NOT (lower(t.pricing) LIKE '%free%' OR lower(t.pricing) LIKE '%open-source%')");
  return { clauses, values };
}

export async function getPublishedTool(db: D1Database, slug: string): Promise<CatalogTool | null> {
  const result = await db.prepare(`
    SELECT ${toolFields}
    FROM tools t
    LEFT JOIN tool_categories tc ON tc.tool_id = t.id
    LEFT JOIN categories c ON c.id = tc.category_id
    LEFT JOIN tool_scenes ts ON ts.tool_id = t.id
    LEFT JOIN scenes s ON s.id = ts.scene_id
    WHERE t.status = 'published' AND t.slug = ?
    GROUP BY t.id
  `).bind(slug).all<CatalogRow>();

  return result.results[0] ? toCatalogTool(result.results[0]) : null;
}
