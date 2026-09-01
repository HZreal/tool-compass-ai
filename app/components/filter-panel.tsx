import type { CatalogCategory, CatalogScene } from "../lib/catalog";
import type { DiscoveryFilters } from "../lib/discovery";

type FilterPanelProps = {
  filters: DiscoveryFilters;
  categories: CatalogCategory[];
  scenes: CatalogScene[];
};

export function FilterPanel({ filters, categories, scenes }: FilterPanelProps) {
  return (
    <form className="filter-panel" action="/discover" method="get">
      <div className="filter-panel__heading">
        <div>
          <span className="section-kicker">缩小范围</span>
          <h2>检索条件</h2>
        </div>
        <a href="/discover">清除</a>
      </div>
      <input type="hidden" name="q" value={filters.query ?? ""} />
      <label>
        分类
        <select name="category" defaultValue={filters.category ?? ""}>
          <option value="">全部分类</option>
          {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
        </select>
      </label>
      <label>
        任务场景
        <select name="scene" defaultValue={filters.scene ?? ""}>
          <option value="">全部场景</option>
          {scenes.map((scene) => <option key={scene.slug} value={scene.slug}>{scene.name}</option>)}
        </select>
      </label>
      <label>
        使用平台
        <select name="platform" defaultValue={filters.platform ?? ""}>
          <option value="">全部平台</option>
          <option value="web">网页端</option>
          <option value="desktop">桌面端</option>
          <option value="mobile">移动端</option>
          <option value="api">API</option>
        </select>
      </label>
      <label>
        定价
        <select name="pricing" defaultValue={filters.pricing ?? ""}>
          <option value="">不限</option>
          <option value="free">免费或开源</option>
          <option value="paid">提供付费方案</option>
        </select>
      </label>
      <label className="filter-panel__check">
        <input type="checkbox" name="featured" value="true" defaultChecked={filters.featured} />
        仅看编辑精选
      </label>
      <button className="button button--ink" type="submit">应用筛选</button>
    </form>
  );
}
