import type { ToolStatus } from "../../drizzle/schema";

export type D1Result<T> = { results: T[] };

export type D1Database = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<D1Result<T>>;
    };
  };
};

export type CatalogTool = {
  slug: string;
  name: string;
  description: string;
  websiteUrl: string;
  status: ToolStatus;
  featured: boolean;
  categories: string[];
  scenes: string[];
};

export type CatalogFilters = {
  category?: string;
  scene?: string;
  query?: string;
  featured?: boolean;
};

type CatalogRow = Omit<CatalogTool, "categories" | "scenes" | "featured"> & {
  featured: number;
  categories: string | null;
  scenes: string | null;
};

const toolFields = `
  t.slug, t.name, t.description, t.website_url AS websiteUrl, t.status, t.featured,
  GROUP_CONCAT(DISTINCT c.slug) AS categories,
  GROUP_CONCAT(DISTINCT s.slug) AS scenes
`;

function toCatalogTool(row: CatalogRow): CatalogTool {
  return {
    ...row,
    featured: Boolean(row.featured),
    categories: row.categories?.split(",") ?? [],
    scenes: row.scenes?.split(",") ?? [],
  };
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
    values.push(filters.query.trim());
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
    ORDER BY t.featured DESC, t.name COLLATE NOCASE ASC
  `).bind(...values).all<CatalogRow>();

  return result.results.map(toCatalogTool);
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
