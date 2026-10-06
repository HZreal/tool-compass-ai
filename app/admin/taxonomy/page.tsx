import { AdminAccessDenied, AdminPageShell } from "../page";
import { AdminAuthError, requireAdminPage } from "../../lib/admin-auth";
import { listAdminTaxonomy, taxonomyKinds, type TaxonomyKind, type TaxonomyRecord } from "../../lib/taxonomy";
import { TaxonomyForm } from "../../components/admin/taxonomy-form";

export const dynamic = "force-dynamic";
const labels: Record<TaxonomyKind, string> = { categories: "分类", scenes: "场景", tags: "标签" };

export function AdminTaxonomyView({ taxonomy }: { taxonomy: Record<TaxonomyKind, TaxonomyRecord[]> }) {
  return <AdminPageShell eyebrow="Catalog structure" title="分类、场景与标签">
    <p className="admin-lede">排序值越小越靠前。分类和场景被引用时不可删除；标签重命名与删除会同步更新关联工具和搜索索引。</p>
    {taxonomyKinds.map((kind) => <section key={kind} className="admin-panel" aria-label={`${labels[kind]}管理`}>
      <div className="admin-panel-heading"><h2>{labels[kind]}</h2><span>{taxonomy[kind].length} 个条目</span></div>
      <details className="admin-record"><summary><strong>新增{labels[kind]}</strong></summary><div className="admin-record-body"><TaxonomyForm kind={kind} /></div></details>
      {taxonomy[kind].map((item) => <details className="admin-record" key={item.id}>
        <summary><span>顺序 {item.sortOrder}</span><strong>{item.name}</strong><code>{item.slug}</code><span>{item.toolCount} 个工具</span></summary>
        <div className="admin-record-body"><TaxonomyForm kind={kind} item={item} /></div>
      </details>)}
    </section>)}
  </AdminPageShell>;
}

export default async function AdminTaxonomyPage() {
  try { await requireAdminPage("/admin/taxonomy"); }
  catch (error) {
    if (error instanceof AdminAuthError && error.status === 403) return <AdminAccessDenied />;
    throw error;
  }
  const { env } = await import("cloudflare:workers");
  return <AdminTaxonomyView taxonomy={await listAdminTaxonomy(env.DB)} />;
}
