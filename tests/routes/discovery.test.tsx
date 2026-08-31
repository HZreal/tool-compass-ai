import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { FilterPanel } from "../../app/components/filter-panel";
import { ToolGrid } from "../../app/components/tool-grid";
import { DiscoveryRouteNotFound, requirePublishedTool } from "../../app/lib/discovery";
import type { CatalogTool } from "../../app/lib/catalog";
import { HomeView } from "../../app/page";
import { SearchResultsView } from "../../app/search/page";
import { ScenePageView } from "../../app/scene/[slug]/page";
import { ToolDetailView } from "../../app/tool/[slug]/page";

const publishedTool: CatalogTool = {
  slug: "chatgpt",
  name: "ChatGPT",
  description: "A general-purpose AI assistant for writing and analysis.",
  websiteUrl: "https://chatgpt.com",
  pricing: "Free tier; Plus and Pro plans",
  tags: ["assistant", "writing"],
  verifiedAt: "2026-08-31",
  editorialNote: "A strong starting point for general AI work.",
  platforms: ["web", "macOS", "iOS"],
  languages: ["Chinese", "English"],
  status: "published",
  featured: true,
  categories: ["ai-assistants"],
  scenes: ["chat"],
};

test("tool grid hides unpublished records and renders the discovery metadata readers need", () => {
  const archivedTool: CatalogTool = {
    ...publishedTool,
    slug: "archived-tool",
    name: "Archived Tool",
    status: "archived",
  };

  const html = renderToStaticMarkup(<ToolGrid tools={[publishedTool, archivedTool]} />);

  assert.match(html, /href="\/tool\/chatgpt"/);
  assert.match(html, /ChatGPT/);
  assert.match(html, /general-purpose AI assistant/);
  assert.match(html, /Free tier; Plus and Pro plans/);
  assert.match(html, /assistant/);
  assert.match(html, /2026-08-31/);
  assert.doesNotMatch(html, /Archived Tool/);
});

test("filter panel submits shareable URL filters and preserves every active value", () => {
  const html = renderToStaticMarkup(
    <FilterPanel
      filters={{
        query: "代码 助手",
        category: "code-development",
        scene: "coding",
        platform: "desktop",
        pricing: "free",
        featured: true,
      }}
    />,
  );

  assert.match(html, /<form[^>]+action="\/discover"[^>]+method="get"/);
  assert.match(html, /name="q" value="代码 助手"/);
  assert.match(html, /<option value="code-development" selected="">/);
  assert.match(html, /<option value="coding" selected="">/);
  assert.match(html, /<option value="desktop" selected="">/);
  assert.match(html, /<option value="free" selected="">/);
  assert.match(html, /name="featured"[^>]+checked=""/);
});

test("empty discovery results recommend scene, catalog and submission routes", () => {
  const html = renderToStaticMarkup(
    <ToolGrid
      tools={[]}
      emptyTitle="没有找到匹配工具"
      suggestedScenes={[{ slug: "coding", name: "辅助编程", description: "构建和维护软件" }]}
    />,
  );

  assert.match(html, /没有找到匹配工具/);
  assert.match(html, /href="\/scene\/coding"/);
  assert.match(html, /href="\/discover"/);
  assert.match(html, /href="\/submit"/);
});

test("unknown or unpublished tool records take the not-found route", () => {
  assert.throws(() => requirePublishedTool(null), DiscoveryRouteNotFound);
  assert.throws(
    () => requirePublishedTool({ ...publishedTool, status: "archived" }),
    DiscoveryRouteNotFound,
  );
  assert.equal(requirePublishedTool(publishedTool), publishedTool);
});

test("homepage leads with task search and editorial scene indexes", () => {
  const html = renderToStaticMarkup(<HomeView featuredTools={[publishedTool]} />);

  assert.match(html, /<main/);
  assert.match(html, /action="\/search"/);
  assert.match(html, /我想完成什么/);
  assert.match(html, /href="\/scene\/coding"/);
  assert.match(html, /href="\/discover\?category=code-development"/);
  assert.match(html, /href="\/tool\/chatgpt"/);
});

test("search no-result view preserves the query and presents recommended discovery routes", () => {
  const html = renderToStaticMarkup(
    <SearchResultsView
      query="不存在的工具"
      result={{
        tools: [], total: 0, page: 1, totalPages: 0,
        suggestedScenes: [{ slug: "research", name: "研究分析", description: "查找证据" }],
      }}
    />,
  );

  assert.match(html, /value="不存在的工具"/);
  assert.match(html, /没有找到“不存在的工具”/);
  assert.match(html, /href="\/scene\/research"/);
  assert.match(html, /href="\/discover"/);
  assert.match(html, /href="\/submit"/);
});

test("scene and tool detail views form a readable path through related tools", () => {
  const relatedTool = { ...publishedTool, slug: "claude", name: "Claude", featured: false };
  const sceneHtml = renderToStaticMarkup(
    <ScenePageView scene={{ slug: "chat", name: "写作与对话", description: "起草、改写、总结与日常问答", index: "01" }} tools={[publishedTool]} />,
  );
  const detailHtml = renderToStaticMarkup(<ToolDetailView tool={publishedTool} relatedTools={[relatedTool]} />);

  assert.match(sceneHtml, /写作与对话/);
  assert.match(sceneHtml, /href="\/tool\/chatgpt"/);
  assert.match(detailHtml, /A strong starting point for general AI work/);
  assert.match(detailHtml, /macOS/);
  assert.match(detailHtml, /Chinese/);
  assert.match(detailHtml, /href="\/tool\/claude"/);
  assert.match(detailHtml, /href="\/go\/chatgpt"[^>]+target="_blank"[^>]+rel="noreferrer"/);
});
