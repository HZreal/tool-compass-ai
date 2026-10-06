import { ToolForm } from "../../components/admin/tool-form";
import { AdminAccessDenied, AdminPageShell } from "../page";
import { AdminAuthError, requireAdminPage } from "../../lib/admin-auth";
import { listAdminTools, type AdminToolRecord } from "../../lib/admin-data";
import { listCatalogCategories, listCatalogScenes } from "../../lib/catalog";

export const dynamic = "force-dynamic";

type TaxonomyOption = { slug: string; name: string };

export function AdminToolsView({
  tools,
  categories,
  scenes,
}: {
  tools: AdminToolRecord[];
  categories: TaxonomyOption[];
  scenes: TaxonomyOption[];
}) {
  return (
    <AdminPageShell eyebrow="Catalog operations" title="工具目录">
      <section className="admin-panel" aria-labelledby="new-tool-title">
        <div className="admin-panel-heading"><div><p>New record</p><h2 id="new-tool-title">新增草稿</h2></div><span>保存后不会公开显示</span></div>
        <ToolForm categories={categories} scenes={scenes} />
      </section>
      <section className="admin-record-list" aria-labelledby="tool-list-title">
        <div className="admin-section-title"><h2 id="tool-list-title">现有工具</h2><span>{tools.length} 条</span></div>
        {tools.length ? tools.map((tool) => (
          <details className="admin-record" key={tool.id}>
            <summary>
              <span className={`admin-status admin-status--${tool.status}`}>{statusLabel(tool.status)}</span>
              <strong>{tool.name}</strong><code>{tool.slug}</code><span aria-hidden="true">＋</span>
            </summary>
            <div className="admin-record-body"><ToolForm tool={tool} categories={categories} scenes={scenes} /></div>
          </details>
        )) : <p className="admin-empty">尚无工具记录。先创建第一份草稿。</p>}
      </section>
    </AdminPageShell>
  );
}

function statusLabel(status: AdminToolRecord["status"]) {
  return status === "draft" ? "草稿" : status === "published" ? "已发布" : "已归档";
}

export default async function AdminToolsPage() {
  try {
    await requireAdminPage("/admin/tools");
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 403) return <AdminAccessDenied />;
    throw error;
  }
  const { env } = await import("cloudflare:workers");
  const [tools, categories, scenes] = await Promise.all([
    listAdminTools(env.DB),
    listCatalogCategories(env.DB),
    listCatalogScenes(env.DB),
  ]);
  return <AdminToolsView tools={tools} categories={categories} scenes={scenes} />;
}
