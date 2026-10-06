import type { D1Database } from "./catalog";

export const taxonomyKinds = ["categories", "scenes", "tags"] as const;
export type TaxonomyKind = (typeof taxonomyKinds)[number];
export type TaxonomyRecord = {
  id: number;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  toolCount: number;
};

export async function listAdminTaxonomy(db: D1Database): Promise<Record<TaxonomyKind, TaxonomyRecord[]>> {
  const lists = await Promise.all(taxonomyKinds.map(async (kind) => {
    const relation = kind === "categories" ? "tool_categories" : kind === "scenes" ? "tool_scenes" : "tool_tags";
    const key = kind === "categories" ? "category_id" : kind === "scenes" ? "scene_id" : "tag_id";
    const result = await db.prepare(`SELECT t.id, t.slug, t.name, t.description, t.sort_order AS sortOrder,
      (SELECT COUNT(*) FROM ${relation} r WHERE r.${key} = t.id) AS toolCount
      FROM ${kind} t ORDER BY t.sort_order, t.id`).bind().all<TaxonomyRecord>();
    return [kind, result.results] as const;
  }));
  return Object.fromEntries(lists) as Record<TaxonomyKind, TaxonomyRecord[]>;
}
