# Task 3 report

## 改动

- 新增 `app/lib/catalog.ts`：仅查询 `published` 记录的目录、交集筛选与详情查询。
- 新增 `app/lib/search.ts`：使用 D1 FTS5 的参数绑定查询、每页 18 条分页，以及无结果场景建议。
- 新增只读 `/api/tools` 与 `/api/search`；通过 `cloudflare:workers` 的 `env.DB` 调用领域服务。
- 新增目录和搜索测试；`app/lib/db.ts` 保持 Task 2 既有导入路径的兼容性再导出。

## TDD 与验证

- RED：`node --import tsx --test tests/lib/catalog.test.ts tests/api/search.test.ts` 在实现前因缺少 `app/lib/catalog` 与 `app/lib/public-api` 失败（`ERR_MODULE_NOT_FOUND`）。
- GREEN：Node 22.13 下相同命令通过，4/4 测试通过。
- `PATH=/Users/huang/.nvm/versions/node/v22.13.0/bin:$PATH npm test`：通过，4/4 原有测试通过（构建也通过）。
- `PATH=/Users/huang/.nvm/versions/node/v22.13.0/bin:$PATH npm run build`：通过。
- `PATH=/Users/huang/.nvm/versions/node/v22.13.0/bin:$PATH npm run lint`：通过。
- 全量显式测试：`node --import tsx --test tests/smoke/app-shell.test.tsx tests/db/catalog-schema.test.ts tests/lib/catalog.test.ts tests/api/search.test.ts`，8/8 通过。
- `EXPLAIN QUERY PLAN`：FTS 查询为 `SCAN tools_fts VIRTUAL TABLE INDEX 0:M3`；按分类关系查询为 `SEARCH tool_categories USING COVERING INDEX tool_categories_category_tool_idx (category_id=?)`。

## 提交

- `51d11556e0684b197cf5c005b5e4c6a9dfa04af7` — `feat: add catalog browsing and search APIs`

## 风险/顾虑

- 本机默认 Node 20.19.0 不满足项目声明的 Node >=22，且缺少 vinext 构建依赖的 `node:fs/promises` `glob`；验证必须使用 Node 22.13。
- vinext 构建会给 `/api/search`、`/api/tools` 标记为静态分析无法分类的动态 API，但最终构建成功；这是框架当前的诊断提示。
