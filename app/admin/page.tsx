/* eslint-disable @next/next/no-html-link-for-pages -- route tests render VINext server components directly. */
import { AdminAuthError, requireAdminPage } from "../lib/admin-auth";
import { getAdminDashboardCounts } from "../lib/admin-data";

export const dynamic = "force-dynamic";

export function AdminHomeView({
  toolCount,
  pendingSubmissionCount,
}: {
  toolCount: number;
  pendingSubmissionCount: number;
}) {
  return (
    <AdminPageShell eyebrow="Editorial desk" title="编辑工作台">
      <p className="admin-lede">这里处理目录内容与读者投稿。所有变更都由服务端鉴权并写入审计记录。</p>
      <div className="admin-dashboard-grid">
        <a className="admin-dashboard-card" href="/admin/tools">
          <span>01 / 目录</span><strong>{toolCount}</strong><h2>管理工具</h2><p>创建草稿、编辑资料、发布或归档。</p>
        </a>
        <a className="admin-dashboard-card admin-dashboard-card--accent" href="/admin/submissions">
          <span>02 / 队列</span><strong>{pendingSubmissionCount}</strong><h2>审核投稿</h2><p>核验读者推荐与资料纠错。</p>
        </a>
        <a className="admin-dashboard-card" href="/admin/taxonomy"><span>03 / 内容组织</span><h2>分类、场景与标签</h2><p>管理名称、描述、排序和工具关联。</p></a>
        <a className="admin-dashboard-card" href="/admin/operations"><span>04 / 数据维护</span><h2>导入与备份</h2><p>初始化目录、导出备份和恢复数据。</p></a>
      </div>
    </AdminPageShell>
  );
}

export function AdminPageShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a className="admin-wordmark" href="/admin"><span>盘</span><strong>Tool Compass AI / Admin</strong></a>
        <nav aria-label="管理导航"><a href="/admin/tools">工具</a><a href="/admin/taxonomy">分类与标签</a><a href="/admin/submissions">投稿</a><a href="/admin/operations">数据维护</a><a href="/">查看站点</a></nav>
      </header>
      <main className="admin-main">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children}
      </main>
    </div>
  );
}

export function AdminAccessDenied({ userId }: { userId?: string }) {
  return (
    <AdminPageShell eyebrow="Access denied" title="无权访问">
      <p className="admin-lede">此编辑后台仅向指定的 ChatGPT 用户开放。</p>
      {userId ? <p>当前站点用户 ID：<code>{userId}</code>。如果你是站点所有者，请用此 ID 配置管理员身份。</p> : null}
      <a className="button button--ink" href="/">返回站点</a>
    </AdminPageShell>
  );
}

export default async function AdminPage() {
  try {
    await requireAdminPage("/admin");
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 403) {
      const { getChatGPTUser } = await import("../chatgpt-auth");
      const user = await getChatGPTUser();
      return <AdminAccessDenied userId={user?.userId} />;
    }
    throw error;
  }
  const { env } = await import("cloudflare:workers");
  const counts = await getAdminDashboardCounts(env.DB);
  return <AdminHomeView {...counts} />;
}
