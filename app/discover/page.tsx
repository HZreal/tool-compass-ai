import { FilterPanel } from "../components/filter-panel";
import { SearchBox } from "../components/search-box";
import { SiteHeader } from "../components/site-header";
import { ToolGrid } from "../components/tool-grid";
import type { CatalogCategory, CatalogScene, CatalogTool } from "../lib/catalog";
import { listCatalogCategories, listCatalogScenes, listPublishedTools } from "../lib/catalog";
import { filterDisplayTools, singleParam, type DiscoveryFilters } from "../lib/discovery";

type QueryParams = Record<string, string | string[] | undefined>;

export function DiscoveryPageView({ tools, filters, categories, scenes }: { tools: CatalogTool[]; filters: DiscoveryFilters; categories: CatalogCategory[]; scenes: CatalogScene[] }) {
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
              <div><p className="section-kicker">检索结果</p><h2 id="results-title">{tools.length} 件工具档案</h2></div>
              <span>按编辑精选与名称排序</span>
            </div>
            <ToolGrid tools={tools} emptyTitle="当前条件下没有匹配工具" />
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
    platform: singleParam(params.platform),
    pricing: singleParam(params.pricing),
    featured: singleParam(params.featured) === "true",
  };
  const { env } = await import("cloudflare:workers");
  const [catalogTools, categories, scenes] = await Promise.all([listPublishedTools(env.DB, {
    query: filters.query || undefined,
    category: filters.category || undefined,
    scene: filters.scene || undefined,
    featured: filters.featured || undefined,
  }), listCatalogCategories(env.DB), listCatalogScenes(env.DB)]);
  return <DiscoveryPageView tools={filterDisplayTools(catalogTools, filters)} filters={filters} categories={categories} scenes={scenes} />;
}
