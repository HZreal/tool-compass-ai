/* eslint-disable @next/next/no-html-link-for-pages -- VINext exposes Next aliases only during its build, while route tests render this server component directly. */
import { SearchBox } from "./search-box";

type SiteHeaderProps = { searchValue?: string };

export function SiteHeader({ searchValue }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a className="wordmark" href="/" aria-label="AI Scenery 首页">
        <span aria-hidden="true">景</span>
        <strong>AI Scenery</strong>
        <small>编辑部工具图鉴</small>
      </a>
      <nav aria-label="主导航">
        <a href="/">首页</a>
        <a href="/discover">目录</a>
        <a href="/search">搜索</a>
        <a href="/submit">投稿</a>
        <a href="/admin">后台</a>
      </nav>
      <div className="site-header__search"><SearchBox compact id="header-search" defaultValue={searchValue} /></div>
    </header>
  );
}
