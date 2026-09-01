import { SubmissionReviewForm } from "../../components/admin/submission-review-form";
import { AdminAccessDenied, AdminPageShell } from "../page";
import { AdminAuthError, requireAdminPage } from "../../lib/admin-auth";
import { listAdminSubmissions, type AdminSubmissionRecord } from "../../lib/admin-data";

export const dynamic = "force-dynamic";

export function AdminSubmissionsView({ submissions }: { submissions: AdminSubmissionRecord[] }) {
  return (
    <AdminPageShell eyebrow="Review queue" title="投稿审核">
      <div className="admin-section-title"><h2>按待处理优先排序</h2><span>{submissions.filter(({ status }) => status === "pending").length} 条待审</span></div>
      <section className="admin-submission-list" aria-label="投稿列表">
        {submissions.length ? submissions.map((submission) => (
          <article className="admin-submission" key={submission.id}>
            <div className="admin-submission-meta">
              <span className={`admin-status admin-status--${submission.status}`}>{submissionStatusLabel(submission.status)}</span>
              <span>{submission.type === "recommendation" ? "工具推荐" : "资料纠错"}</span>
              <time>{submission.createdAt}</time>
            </div>
            <h2>{submission.toolName}</h2>
            <a href={submission.websiteUrl} target="_blank" rel="noopener noreferrer">{submission.websiteUrl}</a>
            <p>{submission.message}</p>
            {submission.email ? <small>联系邮箱：{submission.email}</small> : null}
            {submission.status === "pending" ? <SubmissionReviewForm id={submission.id} /> : (
              <p className="admin-review-note"><strong>审核说明</strong>{submission.reviewNote}</p>
            )}
          </article>
        )) : <p className="admin-empty">目前没有投稿。</p>}
      </section>
    </AdminPageShell>
  );
}

function submissionStatusLabel(status: AdminSubmissionRecord["status"]) {
  return status === "pending" ? "待审核" : status === "approved" ? "已批准" : "已拒绝";
}

export default async function AdminSubmissionsPage() {
  try {
    await requireAdminPage("/admin/submissions");
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 403) return <AdminAccessDenied />;
    throw error;
  }
  const { env } = await import("cloudflare:workers");
  return <AdminSubmissionsView submissions={await listAdminSubmissions(env.DB)} />;
}
