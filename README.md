# Tool Compass AI

一个面向真实工作任务的 AI 工具策展目录。它不是“收录越多越好”的导航站，而是由编辑筛选工具、场景和使用价值，帮助访客从具体任务出发找到合适的产品。

## 已实现能力

- 首页精选、工具目录、分类与任务场景浏览。
- 中文关键词搜索、地区/平台/定价组合筛选，以及工具详情与安全外跳统计。
- 工具投稿与纠错；公开页只展示已发布记录。
- 单管理员后台：工具草稿、发布、归档、精选排序、投稿审核与一键转草稿。
- 分类、场景、标签的维护和排序；分类/场景被引用时禁止删除。
- 结构化定价、地区、别名、Logo、来源链接和核验日期。
- D1 备份下载、确认式恢复、审计记录及一次性官方资料导入。

## 技术栈

- React 19、TypeScript、VINext / Vite。
- Cloudflare Workers、D1（SQLite FTS5）和 Drizzle SQL migrations。
- Zod 输入校验、Playwright + axe 无障碍端到端测试。
- OpenAI Sites 私有托管；服务端 `ADMIN_USER_ID` 精确限制唯一管理员。

## 本地启动

前置条件：Node.js 22.13 或更高版本。推荐使用仓库锁定的 npm 依赖。

```bash
npm install
npm run db:seed:local
npm run dev
```

打开 `http://localhost:3000`。`db:seed:local` 会重建本地 D1 资料，若要保留本地编辑记录，请先不要执行它。

本地开发环境可通过 `/signin-with-chatgpt?return_to=/admin` 进入管理员预览；生产环境只信任 Sites 注入的 ChatGPT 身份，并要求 `ADMIN_USER_ID` 与唯一管理员一致。

## 常用命令

```bash
npm run build       # 生产构建
npm run typecheck   # 严格 TypeScript 检查
npm run lint        # ESLint
npm test            # 单元、路由与 D1 集成测试
npm run test:e2e    # Playwright 与 axe 端到端测试
npm run db:seed:local
```

## 数据与运营

- 数据库迁移位于 `drizzle/`，按文件序号顺序应用。
- 初始策展资料在 `db/seed.ts`，已核验的国内外资料位于 `db/curated-*.json`。
- 线上数据库迁移后，管理员可从 `/admin/operations` 执行一次性资料导入；该操作不会由公开访问自动触发。
- 备份与恢复、管理员配置、上线检查见 [docs/operations.md](docs/operations.md)。
- 产品范围、当前状态和待办见 [docs/project-status.md](docs/project-status.md)。

## Git worktree 说明

主工作区的 `.worktrees/` 被 `.gitignore` 忽略，是为了防止把嵌套 checkout 当作普通目录加入主分支；这不影响 worktree 内的源码被 Git 管理。

本项目开发分支位于 `.worktrees/tool-compass-ai-mvp`，应在该目录中提交和推送：

```bash
git -C .worktrees/tool-compass-ai-mvp status
git -C .worktrees/tool-compass-ai-mvp push -u origin feat/tool-compass-ai
```

不要执行 `git add .worktrees`，也不要移除忽略规则。功能分支推送到远端后，再通过 Pull Request 或审查确认合并到 `main`。

## 安全边界

- 写接口必须经过服务端管理员校验，不能依赖前端隐藏按钮。
- 公开外跳仅记录工具 ID、同源来源路径和时间，不记录 IP、账户或查询参数。
- 投稿邮箱仅用于编辑联系；备份可能包含邮箱，应按敏感数据保存。
- 外部官网、Logo 和来源链接只接受不含用户名/密码的 HTTPS 地址。

## 许可证

当前仓库尚未声明开源许可证。在添加许可证前，请勿假设可以再分发或商用。
