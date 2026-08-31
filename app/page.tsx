import type { CatalogTool } from "./lib/catalog";
import { listPublishedTools } from "./lib/catalog";
import { categoryOptions, sceneOptions } from "./lib/discovery";
import { SearchBox } from "./components/search-box";
import { SiteHeader } from "./components/site-header";
import { ToolGrid } from "./components/tool-grid";

export function HomeView({ featuredTools }: { featuredTools: CatalogTool[] }) {
  return (
    <div className="site-shell page-frame">
      <SiteHeader />
      <main>
        <section className="hero home-hero" aria-labelledby="site-title">
          <div className="home-hero__copy">
            <p className="eyebrow"><span>Vol. 01</span> 面向真实工作的 AI 工具索引</p>
            <h1 id="site-title">AI Scenery</h1>
            <h2>先说任务，<br /><em>再选工具。</em></h2>
            <p className="intro">不追逐收录数量。编辑部逐一核验成熟工具，帮你从一项具体工作出发，找到值得打开的那一个。</p>
          </div>
          <div className="home-hero__search">
            <p>今天，你想完成什么？</p>
            <SearchBox />
            <div className="search-prompts" aria-label="搜索示例">
              <span>试试：</span>
              <a href="/search?q=research">研究资料</a>
              <a href="/search?q=video">制作视频</a>
              <a href="/search?q=code">编程开发</a>
            </div>
          </div>
          <aside className="hero-note" aria-label="编辑部说明">
            <span>编者按</span>
            <p>每张卡片只回答一件事：它究竟能帮你完成什么。</p>
          </aside>
        </section>

        <section className="section-block scene-section" id="scenes" aria-labelledby="scene-title">
          <div className="section-heading">
            <div><p className="section-kicker">按目的翻阅</p><h2 id="scene-title">我想完成什么</h2></div>
            <p>把工具名放一边，从你手头的任务开始。</p>
          </div>
          <div className="scene-index">
            {sceneOptions.map((scene) => (
              <a className="scene-card" href={`/scene/${scene.slug}`} key={scene.slug}>
                <span className="scene-card__index">{scene.index}</span>
                <div><h3>{scene.name}</h3><p>{scene.description}</p></div>
                <span className="scene-card__arrow" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </section>

        <section className="section-block" aria-labelledby="category-title">
          <div className="section-heading section-heading--line">
            <div><p className="section-kicker">按门类查找</p><h2 id="category-title">分类目录</h2></div>
            <a className="text-link" href="/discover">打开完整图鉴 →</a>
          </div>
          <div className="category-strip">
            {categoryOptions.map((category, index) => (
              <a href={`/discover?category=${category.slug}`} key={category.slug}>
                <span>{String(index + 1).padStart(2, "0")}</span>{category.name}
              </a>
            ))}
          </div>
        </section>

        <section className="section-block featured-section" aria-labelledby="featured-title">
          <div className="section-heading">
            <div><p className="section-kicker section-kicker--red">本期选录</p><h2 id="featured-title">编辑精选</h2></div>
            <p>适合第一次打开图鉴的人，从这些成熟、通用且近期复核的工具开始。</p>
          </div>
          <ToolGrid tools={featuredTools} />
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <p><strong>AI Scenery</strong> · 编辑部工具图鉴</p>
      <p>资料会变化，使用前请以工具官网为准。</p>
    </footer>
  );
}

export default async function Home() {
  const { env } = await import("cloudflare:workers");
  const featuredTools = await listPublishedTools(env.DB, { featured: true });
  return <HomeView featuredTools={featuredTools} />;
}
