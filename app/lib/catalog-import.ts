import { categories, scenes, tools } from '../../db/seed';
import domestic from '../../db/curated-domestic.json';
import international from '../../db/curated-international.json';
import type { D1Database } from './catalog';

export const CATALOG_IMPORT_ID = 'official-review-2026-09-05';

export type CatalogImportStatus = {
  imported: boolean;
  totalPublished: number;
  domesticPublished: number;
};

export async function getCatalogImportStatus(db: D1Database): Promise<CatalogImportStatus> {
  const row = await db.prepare(`SELECT
    EXISTS(SELECT 1 FROM catalog_imports WHERE id = ?) AS imported,
    (SELECT COUNT(*) FROM tools WHERE status = 'published') AS totalPublished,
    (SELECT COUNT(*) FROM tools WHERE status = 'published' AND region = 'domestic') AS domesticPublished
  `).bind(CATALOG_IMPORT_ID).first<{ imported: number; totalPublished: number; domesticPublished: number }>();
  if (!row) throw new Error('无法读取目录导入状态');
  return { imported: Boolean(row.imported), totalPublished: row.totalPublished, domesticPublished: row.domesticPublished };
}

export async function importReviewedCatalog(db: D1Database) {
  const before = await getCatalogImportStatus(db);
  if (before.imported) return { alreadyImported: true, ...before };
  const statements = [db.prepare('INSERT INTO catalog_imports (id) VALUES (?)').bind(CATALOG_IMPORT_ID)];
  for (const [slug, name, description, rank] of categories) statements.push(db.prepare('INSERT INTO categories(slug,name,description,sort_order) VALUES(?,?,?,?) ON CONFLICT(slug) DO NOTHING').bind(slug,name,description,rank));
  for (const [slug, name, description, rank] of scenes) statements.push(db.prepare('INSERT INTO scenes(slug,name,description,sort_order) VALUES(?,?,?,?) ON CONFLICT(slug) DO NOTHING').bind(slug,name,description,rank));
  for (const tool of tools) {
    const reviewed = Boolean(tool.sources?.length);
    statements.push(db.prepare(`INSERT INTO tools(slug,name,description,website_url,aliases,logo_url,region,pricing,pricing_model,tags,verified_at,editorial_note,platforms,languages,status,featured,featured_rank,sources)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,'published',?,?,?) ON CONFLICT(slug) DO NOTHING`).bind(tool.slug, tool.name, tool.description, tool.websiteUrl, JSON.stringify(tool.aliases),tool.logoUrl || null,tool.region, tool.pricing,tool.pricingModel,JSON.stringify(tool.tags),tool.verifiedAt,tool.editorialNote,JSON.stringify(tool.platforms),JSON.stringify(tool.languages),tool.featuredRank === null ? 0 : 1,tool.featuredRank,JSON.stringify(tool.sources ?? [])));
    // Respect all records already modified by the administrator. Review updates
    // apply only to untouched baseline content, never to archived/editorial work.
    if (reviewed) statements.push(db.prepare(`UPDATE tools SET description=?, pricing=?, pricing_model=?, sources=?, verified_at=?, editorial_note=?, aliases=?, region=?, updated_at=CURRENT_TIMESTAMP
      WHERE slug=? AND status='published' AND NOT EXISTS(SELECT 1 FROM admin_audit_events a WHERE a.resource_type='tool' AND a.resource_id=tools.id)`).bind(tool.description,tool.pricing,tool.pricingModel,JSON.stringify(tool.sources),tool.verifiedAt,tool.editorialNote,JSON.stringify(tool.aliases),tool.region,tool.slug));
    const record = [...domestic.tools,...international.tools].find(item => item.slug === tool.slug);
    for (const scene of record?.scenes ?? [tool.scene]) statements.push(db.prepare(`INSERT OR IGNORE INTO tool_scenes(tool_id,scene_id) SELECT t.id,s.id FROM tools t,scenes s WHERE t.slug=? AND s.slug=? AND NOT EXISTS(SELECT 1 FROM admin_audit_events a WHERE a.resource_type='tool' AND a.resource_id=t.id)`).bind(tool.slug,scene));
    statements.push(db.prepare(`INSERT OR IGNORE INTO tool_categories(tool_id,category_id) SELECT t.id,c.id FROM tools t,categories c WHERE t.slug=? AND c.slug=? AND NOT EXISTS(SELECT 1 FROM admin_audit_events a WHERE a.resource_type='tool' AND a.resource_id=t.id)`).bind(tool.slug,tool.category));
  }
  // Backfill the normalized relation through its regular synchronization trigger.
  statements.push(db.prepare('UPDATE tools SET tags=tags'));
  statements.push(db.prepare("INSERT INTO admin_audit_events(action,resource_type,resource_id) VALUES('catalog.import','catalog',0)"));
  await db.batch(statements);
  return { alreadyImported: false, reviewed: 18, domestic: 12, ...await getCatalogImportStatus(db) };
}
