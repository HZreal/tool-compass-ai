import type { CatalogTool } from "../lib/catalog";

type ToolCardProps = { tool: CatalogTool; ordinal?: number };

export function ToolCard({ tool, ordinal }: ToolCardProps) {
  return (
    <article className="tool-card">
      <div className="tool-card__topline">
        <span className="tool-card__index">{String(ordinal ?? 1).padStart(2, "0")}</span>
        {tool.featured ? <span className="editor-pick">编辑精选</span> : <span className="tool-card__category">工具档案</span>}
      </div>
      <div className="tool-card__body">
        <h3><a href={`/tool/${tool.slug}`}>{tool.name}</a></h3>
        <p>{tool.description}</p>
      </div>
      <dl className="tool-card__facts">
        <div><dt>定价</dt><dd>{tool.pricing}</dd></div>
        <div><dt>核验</dt><dd><time dateTime={tool.verifiedAt}>{tool.verifiedAt}</time></dd></div>
      </dl>
      <div className="tag-row" aria-label="工具标签">
        {tool.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
      </div>
      <a className="tool-card__link" href={`/tool/${tool.slug}`} aria-label={`查看 ${tool.name} 详情`}>
        阅读档案 <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}
