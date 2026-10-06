type SearchBoxProps = {
  defaultValue?: string;
  compact?: boolean;
  id?: string;
};

export function SearchBox({ defaultValue = "", compact = false, id }: SearchBoxProps) {
  const inputId = id ?? (compact ? "site-search-compact" : "site-search");
  return (
    <form className={`search-box${compact ? " search-box--compact" : ""}`} action="/search" method="get" role="search">
      <label className="sr-only" htmlFor={inputId}>搜索 AI 工具</label>
      <span className="search-box__mark" aria-hidden="true">⌕</span>
      <input
        id={inputId}
        name="q"
        type="search"
        minLength={2}
        maxLength={80}
        defaultValue={defaultValue}
        placeholder="描述你想完成的任务，例如：整理研究资料"
      />
      <button type="submit">开始查找 <span aria-hidden="true">→</span></button>
    </form>
  );
}
