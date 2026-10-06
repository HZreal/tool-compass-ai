# Task 5 修复报告

## 修复内容

- 工具详情页的“访问官网”CTA 继续通过同源 `/go/:slug` 追踪跳转，并保持新标签打开。
- 将 CTA 的 `rel` 从 `noreferrer` 改为 `noopener`，使浏览器将详情页作为 Referer 发送给同源跳转路由；`noopener` 仍隔离新窗口的 opener。
- `/go/:slug` 服务端只持久化同源 Referer 的 pathname；新增回归覆盖同源 query 和外站 IP/查询参数，确认它们都不会被存储。

## TDD 与验证

- 红灯：CTA 测试先要求 `rel="noopener"` 且禁止 `noreferrer`，旧实现按预期失败。
- 绿灯：`npm run test:routes`，13 passed。
- Node `v22.23.2`
- `npm test`：24 passed。
- `npm run lint`：passed。
- `npm run build`：passed。
