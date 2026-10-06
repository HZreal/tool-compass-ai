import { SiteHeader } from "../../components/site-header";
import { ToolGrid } from "../../components/tool-grid";
import { getCatalogScene, listPublishedTools, type CatalogScene, type CatalogTool } from "../../lib/catalog";
import { requireCatalogScene } from "../../lib/discovery";

export function ScenePageView({ scene, sceneIndex, tools }: { scene: CatalogScene; sceneIndex: string; tools: CatalogTool[] }) {
  return (
    <div className="page-frame">
      <SiteHeader />
      <main className="scene-page">
        <header className="scene-page__hero">
          <span className="scene-page__number">{sceneIndex}</span>
          <div><p className="section-kicker">任务场景</p><h1>{scene.name}</h1><p>{scene.description}</p></div>
          <a className="text-link" href="/discover">查看全部工具 →</a>
        </header>
        <section aria-labelledby="scene-results-title">
          <div className="results-heading">
            <div><p className="section-kicker">编辑部选录</p><h2 id="scene-results-title">{tools.length} 件相关工具</h2></div>
            <span>资料按近期核验状态呈现</span>
          </div>
          <ToolGrid tools={tools} emptyTitle="这个场景还在整理中" />
        </section>
      </main>
    </div>
  );
}

export default async function ScenePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { env } = await import("cloudflare:workers");
  const candidate = await getCatalogScene(env.DB, slug);
  if (!candidate) {
    const { notFound } = await import("next/navigation");
    return notFound();
  }
  const scene = requireCatalogScene(candidate);
  const tools = await listPublishedTools(env.DB, { scene: slug });
  return <ScenePageView scene={scene} sceneIndex={String(scene.sortOrder).padStart(2, "0")} tools={tools} />;
}
