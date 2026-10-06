import type { CatalogTool } from "../lib/catalog";
import { ToolCard } from "./tool-card";

type SceneSuggestion = { slug: string; name: string; description: string };

type ToolGridProps = {
  tools: CatalogTool[];
  emptyTitle?: string;
  suggestedScenes?: SceneSuggestion[];
};

export function ToolGrid({ tools, emptyTitle = "暂时没有可展示的工具", suggestedScenes = [] }: ToolGridProps) {
  const publishedTools = tools.filter((tool) => tool.status === "published");

  if (publishedTools.length === 0) {
    return (
      <section className="empty-state" aria-labelledby="empty-title">
        <span className="empty-state__mark" aria-hidden="true">空</span>
        <div>
          <p className="section-kicker">换一条路试试</p>
          <h2 id="empty-title">{emptyTitle}</h2>
          <p>可以浏览完整图鉴，或从编辑部整理的任务场景重新开始。</p>
        </div>
        {suggestedScenes.length > 0 && (
          <div className="empty-state__scenes">
            {suggestedScenes.slice(0, 3).map((scene) => (
              <a key={scene.slug} href={`/scene/${scene.slug}`}>
                <strong>{scene.name}</strong><span>{scene.description}</span>
              </a>
            ))}
          </div>
        )}
        <div className="empty-state__actions">
          <a className="button button--ink" href="/discover">浏览全部工具</a>
          <a className="button button--paper" href="/submit">推荐新工具</a>
        </div>
      </section>
    );
  }

  return (
    <div className="tool-grid">
      {publishedTools.map((tool, index) => <ToolCard key={tool.slug} tool={tool} ordinal={index + 1} />)}
    </div>
  );
}
