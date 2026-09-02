# AI Scenery MVP 验收补强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 AI Scenery 满足原始 MVP 的信息架构、数据契约、单人运营、可访问性和发布准备要求。

**Architecture:** D1 继续作为分类、场景、工具和运营状态的唯一事实来源。通过版本化迁移扩展工具元数据、结构化标签和索引；公开目录的筛选、排序、分页和全文检索均在 D1 中完成，页面仅渲染查询结果。管理端复用现有单管理员鉴权与审计模型，不增加多用户或角色系统。

**Tech Stack:** React、TypeScript、VINext、Sites、Cloudflare D1/SQLite、Drizzle、Zod、FTS5、Vitest、Playwright。

**Spec:** `docs/superpowers/specs/2026-08-31-ai-scenery-mvp-design.md`；`docs/superpowers/specs/2026-08-31-ai-scenery-technical-design.md`

**Status record:** `docs/project-status.md` is the current product and delivery summary. Update it and the checkboxes below together.

## Global Constraints

- 使用原始产品定义的 8 个中文分类和 6 个中文任务场景；slug 可保持稳定英文标识。
- 公开页面只能读取 `published` 工具，D1 是唯一权威数据源。
- 不引入用户系统、第三方 CMS、R2、向量检索或外部搜索服务。
- 所有写接口继续使用服务端 `ADMIN_USER_ID` 精确鉴权并记录审计事件。
- 每页 18 条、最多 100 页；公开外链仍通过 `/go/:slug` 匿名记录。

---

### Task 1: 数据契约与中文信息架构

**Files:**
- Modify: `drizzle/schema.ts`, `db/seed.ts`, `app/lib/catalog.ts`, `app/lib/validation.ts`
- Create: `drizzle/0005_catalog_contract.sql`
- Test: `tests/db/catalog-schema.test.ts`, `tests/lib/catalog.test.ts`

- [x] 写失败测试：种子严格包含 8 个指定中文分类、6 个指定中文场景，工具含别名、地区、Logo、精选排序。
- [ ] 生成迁移，为 `tools` 添加 `aliases`、`logo_url`、`region`、`featured_rank`，新增 `tags`/`tool_tags` 关系表；增加公开目录索引与 FTS 同步字段。`tools` 字段、索引与 FTS 已完成；关系化标签待 Task 3。
- [x] 将 80 条工具重映射到产品规定分类与场景，填充上述字段并保持幂等。待通过本地 seed 命令同步预览数据库。
- [x] 运行 D1 测试、迁移检查和查询计划检查；提交数据契约变更。常见目录筛选的查询计划断言仍待 Task 2 补齐。

### Task 2: D1 目录、搜索与分页

**Files:**
- Modify: `app/lib/catalog.ts`, `app/lib/search.ts`, `app/lib/public-api.ts`, `app/discover/page.tsx`, `app/components/filter-panel.tsx`, `app/components/tool-grid.tsx`
- Test: `tests/lib/catalog.test.ts`, `tests/api/search.test.ts`, `tests/routes/discovery.test.tsx`

- [ ] 写失败测试：别名 FTS 命中、地区/平台/定价交集筛选、精选排序、18 条分页和错误页码边界。目录和 `/api/tools` 的地区/平台/定价交集与分页已覆盖；别名、排序与边界待补。
- [x] 以参数绑定的 D1 SQL 实现条件筛选、总数和分页，不再在页面内存中解析定价或平台。定价暂由 D1 中的既有文本字段过滤，待替换为结构化字段。
- [x] 让目录 URL 与 `/api/tools` 同步 `region`、`platform`、`pricing` 和 `page`，展示/返回总数、当前页与翻页控件。
- [ ] 用 `EXPLAIN QUERY PLAN` 断言常见筛选使用索引；运行相关单元、路由和浏览器测试并提交。

### Task 3: 单管理员运营闭环

**Files:**
- Modify: `app/lib/admin-data.ts`, `app/lib/validation.ts`, `app/api/admin/tools/route.ts`, `app/api/admin/submissions/route.ts`, `app/admin/page.tsx`, `app/admin/tools/page.tsx`, `app/admin/submissions/page.tsx`, `app/components/admin/*`
- Create: `app/admin/taxonomy/page.tsx`, `app/api/admin/taxonomy/route.ts`, `drizzle/0006_admin_taxonomy.sql`
- Test: `tests/routes/admin.test.tsx`, `tests/routes/submission.test.ts`

- [ ] 写失败测试：管理员可维护分类/场景/标签排序，发布工具使用精选排序，待审推荐可转成草稿并保留审计。
- [ ] 分离草稿与发布校验：草稿允许分步录入，发布仍要求必填资料和至少一个分类或场景。
- [ ] 实现分类和场景的单管理员 CRUD/排序、工具的精选排序、投稿转草稿；所有状态变更与审计写入同一 D1 batch。
- [ ] 运行管理员与投稿回归测试，验证公开端只读已发布记录后提交。

### Task 4: 质量门槛与可发现性

**Files:**
- Modify: `tsconfig.json`, `app/components/site-header.tsx`, `app/page.tsx`, `app/globals.css`, 测试类型注解
- Create: `app/types/cloudflare.d.ts`, `tests/e2e/accessibility.spec.ts`
- Test: 现有单元、路由和 Playwright 测试

- [ ] 写失败测试：键盘 Tab 焦点可见、导航含目录/搜索/投稿/后台入口、360px 无横向溢出。
- [ ] 补齐 Worker ambient 类型与测试中的显式类型，令 `npx tsc --noEmit` 成功。
- [ ] 增强全站导航和首页快捷入口，让目录、搜索、投稿和管理员路径可被直接发现。
- [ ] 运行 `npm test`、`npm run test:e2e`、`npm run lint`、`npx tsc --noEmit` 和 360px 旅程并提交。

### Task 5: 缓存、运维与私有发布准备

**Files:**
- Modify: `app/api/tools/route.ts`, `app/api/search/route.ts`, `app/go/[slug]/route.ts`, 管理写接口
- Create: `docs/operations.md`
- Test: `tests/api/search.test.ts`, `tests/routes/admin.test.tsx`

- [ ] 写失败测试：公开读取响应仅获得 5 分钟公共缓存头，后台/写接口保持 `no-store`，修改后返回可用于清理关联缓存的标签。
- [ ] 在不改变 D1 权威性的前提下，为公开读取添加保守缓存元数据，并确保写操作不缓存。
- [ ] 写明 Sites 私有部署、必需 secret、D1 导出/恢复、迁移、月度核验和缓存失效操作。
- [ ] 运行全部验证，生成生产构建；仅在用户授权的账号范围内发起私有 Sites 部署并做线上验收。
