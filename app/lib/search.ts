import { listPublishedToolPage, listCatalogScenes, type CatalogTool, type D1Database } from './catalog';

export const SEARCH_PAGE_SIZE = 18;
export type SearchSceneSuggestion = { slug: string; name: string; description: string };
export type SearchResult = { tools: CatalogTool[]; total: number; page: number; totalPages: number; suggestedScenes: SearchSceneSuggestion[] };

export function isValidSearchQuery(query: string): boolean {
  return query.length >= 2 && query.length <= 80;
}

export function toFtsPhrase(query: string): string {
  return '"' + query.trim().replaceAll('"', '""') + '"';
}

export async function searchPublishedTools(db: D1Database, query: string, page = 1): Promise<SearchResult> {
  const result = await listPublishedToolPage(db, { query, page });
  return { ...result, suggestedScenes: result.total === 0 ? await listCatalogScenes(db) : [] };
}
