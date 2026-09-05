import { FilterPanel } from "../components/filter-panel";
import { SearchBox } from "../components/search-box";
import { SiteHeader } from "../components/site-header";
import { ToolGrid } from "../components/tool-grid";
import type { CatalogCategory, CatalogScene, CatalogTool } from "../lib/catalog";
import { listCatalogCategories, listCatalogScenes, listPublishedToolPage } from "../lib/catalog";
import { singleParam, type DiscoveryFilters } from "../lib/discovery";

type QueryParams = Record<string, string | string[] | undefined>;

export function DiscoveryPageView({ tools, total, page, totalPages, filters, categories, scenes }: { tools: CatalogTool[]; total: number; page: number; totalPages: number; filters: DiscoveryFilters; categories: CatalogCategory[]; scenes: CatalogScene[] }) {
  return (
    <div className="page-frame">
      <SiteHeader searchValue={filters.query} />
      <main className="listing-page">
        <header className="listing-hero">
          <p className="eyebrow"><span>Index</span> 编辑部持续复核</p>
          <h1>工具图鉴</h1>
          <p>从分类、任务、平台与定价逐层缩小范围。当前条件可以直接复制网址分享。</p>
          <SearchBox compact defaultValue={filters.query} />
        </header>
        <div className="catalog-layout">
          <FilterPanel filters={filters} categories={categories} scenes={scenes} />
          <section className="catalog-results" aria-labelledby="results-title">
            <div className="results-heading">
              <div><p className="section-kicker">检索结果</p><h2 id="results-title">{total} 件工具档案</h2></div>
              <span>按编辑精选与名称排序</span>
            </div>
            <ToolGrid tools={tools} emptyTitle="当前条件下没有匹配工具" />
            {totalPages > 1 ? <nav className="pagination" aria-label="目录分页">
              {page > 1 ? <a href={pageHref(filters, page - 1)}>上一页</a> : <span>上一页</span>}
              <strong>第 {page} / {totalPages} 页</strong>
              {page < totalPages ? <a href={pageHref(filters, page + 1)}>下一页</a> : <span>下一页</span>}
            </nav> : null}
          </section>
        </div>
      </main>
    </div>
  );
}

export default async function DiscoverPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const params = await searchParams ?? {};
  const filters: DiscoveryFilters = {
    query: singleParam(params.q).trim(),
    category: singleParam(params.category),
    scene: singleParam(params.scene),
    platform: singleParam(params.platform) as DiscoveryFilters['platform'],
    pricing: singleParam(params.pricing) as DiscoveryFilters['pricing'],
    region: singleParam(params.region) as DiscoveryFilters["region"],
    featured: singleParam(params.featured) === "true",
    page: Number.parseInt(singleParam(params.page) || "1", 10),
  };
  const { env } = await import("cloudflare:workers");
  const [catalogPage, categories, scenes] = await Promise.all([listPublishedToolPage(env.DB, {
    query: filters.query || undefined,
    category: filters.category || undefined,
    scene: filters.scene || undefined,
    featured: filters.featured || undefined,
    region: filters.region || undefined,
    platform: filters.platform || undefined,
    pricing: filters.pricing || undefined,
    page: filters.page,
  }), listCatalogCategories(env.DB), listCatalogScenes(env.DB)]);
  return <DiscoveryPageView {...catalogPage} filters={filters} categories={categories} scenes={scenes} />;
}

function pageHref(filters: DiscoveryFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.category) params.set("category", filters.category);
  if (filters.scene) params.set("scene", filters.scene);
  if (filters.region) params.set("region", filters.region);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.pricing) params.set("pricing", filters.pricing);
  if (filters.featured) params.set("featured", "true");
  params.set("page", String(page));
  return `/discover?${params.toString()}`;
}
