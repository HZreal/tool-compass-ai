import type { ToolStatus } from "../../drizzle/schema";
import type { D1Database } from "./catalog";

export type AdminToolRecord = {
  id: number;
  slug: string;
  name: string;
  description: string;
  websiteUrl: string;
  region?: "domestic" | "overseas";
  aliases?: string[];
  logoUrl?: string | null;
  sources?: string[];
  pricing: string;
  pricingModel?: "free" | "freemium" | "paid" | "usage_based" | "contact" | "unknown";
  featuredRank?: number | null;
  tags: string[];
  verifiedAt: string;
  editorialNote: string;
  platforms: string[];
  languages: string[];
  status: ToolStatus;
  featured: boolean;
  categorySlugs?: string[];
  sceneSlugs?: string[];
  categories: string[];
  scenes: string[];
};

export type AdminSubmissionRecord = {
  id: number;
  type: "recommendation" | "correction";
  toolName: string;
  websiteUrl: string;
  message: string;
  email: string | null;
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  convertedToolId?: number | null;
};

type AdminToolRow = Omit<
  AdminToolRecord,
  "tags" | "platforms" | "languages" | "featured" | "categories" | "scenes" | "aliases" | "sources"
> & {
  aliases: string;
  sources: string;
  tags: string;
  platforms: string;
  languages: string;
  featured: number;
  categories: string | null;
  scenes: string | null;
};

export async function listAdminTools(db: D1Database): Promise<AdminToolRecord[]> {
  const result = await db.prepare(`
    SELECT
      t.id, t.slug, t.name, t.description, t.website_url AS websiteUrl,
      t.region, t.aliases, t.logo_url AS logoUrl, t.sources,
      t.pricing, t.pricing_model AS pricingModel, t.featured_rank AS featuredRank, t.tags, t.verified_at AS verifiedAt,
      t.editorial_note AS editorialNote, t.platforms, t.languages,
      t.status, t.featured,
      GROUP_CONCAT(DISTINCT c.slug) AS categories,
      GROUP_CONCAT(DISTINCT s.slug) AS scenes
    FROM tools t
    LEFT JOIN tool_categories tc ON tc.tool_id = t.id
    LEFT JOIN categories c ON c.id = tc.category_id
    LEFT JOIN tool_scenes ts ON ts.tool_id = t.id
    LEFT JOIN scenes s ON s.id = ts.scene_id
    GROUP BY t.id
    ORDER BY
      CASE t.status WHEN 'draft' THEN 0 WHEN 'published' THEN 1 ELSE 2 END,
      t.updated_at DESC,
      t.name COLLATE NOCASE ASC
  `).bind().all<AdminToolRow>();

  return result.results.map((row) => ({
    ...row,
    tags: parseArray(row.tags),
    aliases: parseArray(row.aliases),
    sources: parseArray(row.sources),
    platforms: parseArray(row.platforms),
    languages: parseArray(row.languages),
    featured: Boolean(row.featured),
    categories: row.categories?.split(",") ?? [],
    scenes: row.scenes?.split(",") ?? [],
  }));
}

export async function listAdminSubmissions(
  db: D1Database,
): Promise<AdminSubmissionRecord[]> {
  const result = await db.prepare(`
    SELECT
      id, type, tool_name AS toolName, website_url AS websiteUrl,
      message, email, status, review_note AS reviewNote,
      created_at AS createdAt, reviewed_at AS reviewedAt, converted_tool_id AS convertedToolId
    FROM submissions
    ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC
  `).bind().all<AdminSubmissionRecord>();
  return result.results;
}

export async function getAdminDashboardCounts(db: D1Database) {
  const counts = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM tools) AS toolCount,
      (SELECT COUNT(*) FROM submissions WHERE status = 'pending') AS pendingSubmissionCount
  `).bind().first<{ toolCount: number; pendingSubmissionCount: number }>();
  return counts ?? { toolCount: 0, pendingSubmissionCount: 0 };
}

function parseArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}
