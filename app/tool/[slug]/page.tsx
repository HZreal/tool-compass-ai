/* eslint-disable @next/next/no-html-link-for-pages -- VINext exposes Next aliases only during its build, while route tests render this server component directly. */
import { SiteHeader } from "../../components/site-header";
import { ToolGrid } from "../../components/tool-grid";
import { getPublishedTool, listPublishedTools, type CatalogTool } from "../../lib/catalog";
import { requirePublishedTool } from "../../lib/discovery";

export function ToolDetailView({ tool, relatedTools }: { tool: CatalogTool; relatedTools: CatalogTool[] }) {
  return (
    <div className="page-frame">
      <SiteHeader />
      <main className="tool-detail">
        <nav className="breadcrumbs" aria-label="面包屑"><a href="/">首页</a><span>/</span><a href="/discover">工具图鉴</a><span>/</span><span>{tool.name}</span></nav>
        <article>
          <header className="tool-detail__hero">
            <div className="tool-monogram" aria-hidden="true">{tool.name.slice(0, 1).toUpperCase()}</div>
            <div className="tool-detail__title">
              <p className="eyebrow">{tool.featured ? "编辑精选 · " : "已收录 · "}<time dateTime={tool.verifiedAt}>{tool.verifiedAt} 核验</time></p>
              <h1>{tool.name}</h1>
              <p>{tool.description}</p>
            </div>
            <a className="button button--red" href={`/go/${tool.slug}`} target="_blank" rel="noreferrer">访问官网 <span aria-hidden="true">↗</span></a>
          </header>

          <div className="tool-detail__layout">
            <section className="editorial-note" aria-labelledby="editor-note-title">
              <p className="section-kicker">Editor note</p>
              <h2 id="editor-note-title">编辑说明</h2>
              <blockquote>{tool.editorialNote}</blockquote>
              <div className="tag-row">{tool.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            </section>
            <aside className="tool-facts" aria-label="工具资料">
              <h2>档案信息</h2>
              <dl>
                <div><dt>定价</dt><dd>{tool.pricing}</dd></div>
                <div><dt>平台</dt><dd>{tool.platforms.join(" · ")}</dd></div>
                <div><dt>语言</dt><dd>{tool.languages.join(" · ")}</dd></div>
                <div><dt>最后核验</dt><dd>{tool.verifiedAt}</dd></div>
              </dl>
            </aside>
          </div>
        </article>

        <section className="related-section" aria-labelledby="related-title">
          <div className="section-heading section-heading--line"><div><p className="section-kicker">继续翻阅</p><h2 id="related-title">同一场景的工具</h2></div></div>
          <ToolGrid tools={relatedTools} emptyTitle="暂时没有更多相关工具" />
        </section>
      </main>
    </div>
  );
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { env } = await import("cloudflare:workers");
  const candidate = await getPublishedTool(env.DB, slug);
  if (!candidate) {
    const { notFound } = await import("next/navigation");
    return notFound();
  }
  const tool = requirePublishedTool(candidate);
  const related = tool.scenes[0]
    ? (await listPublishedTools(env.DB, { scene: tool.scenes[0] })).filter((item) => item.slug !== tool.slug).slice(0, 3)
    : [];
  return <ToolDetailView tool={tool} relatedTools={related} />;
}
