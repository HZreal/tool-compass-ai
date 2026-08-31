import { SearchBox } from "../components/search-box";
import { SiteHeader } from "../components/site-header";
import { ToolGrid } from "../components/tool-grid";
import { isValidSearchQuery, searchPublishedTools, type SearchResult } from "../lib/search";
import { sceneOptions, singleParam } from "../lib/discovery";

export function SearchResultsView({ query, result }: { query: string; result: SearchResult }) {
  return (
    <div className="page-frame">
      <SiteHeader searchValue={query} />
      <main className="search-page">
        <header className="search-page__hero">
          <p className="section-kicker">Search / 站内检索</p>
          <h1>{query ? <>关于“{query}”</> : "搜索工具图鉴"}</h1>
          <SearchBox defaultValue={query} />
          {query && <p className="search-count">找到 {result.total} 件已发布工具</p>}
        </header>
        <section className="search-results" aria-label="搜索结果">
          <ToolGrid
            tools={result.tools}
            emptyTitle={query ? `没有找到“${query}”` : "输入一个任务或工具名称"}
            suggestedScenes={result.suggestedScenes}
          />
        </section>
      </main>
    </div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const query = singleParam((await searchParams ?? {}).q).trim();
  if (!isValidSearchQuery(query)) {
    return <SearchResultsView query={query} result={{ tools: [], total: 0, page: 1, totalPages: 0, suggestedScenes: [...sceneOptions] }} />;
  }
  const { env } = await import("cloudflare:workers");
  const result = await searchPublishedTools(env.DB, query, 1);
  return <SearchResultsView query={query} result={result} />;
}
