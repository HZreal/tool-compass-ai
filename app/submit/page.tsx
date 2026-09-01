import { SiteHeader } from "../components/site-header";
import { SubmissionForm } from "../components/submission-form";

export default function SubmitPage() {
  return (
    <div className="page-frame">
      <SiteHeader />
      <main className="submit-page">
        <p className="section-kicker section-kicker--red">共同维护图鉴</p>
        <h1>推荐收录，或帮我们纠正一处资料。</h1>
        <p className="submit-page__intro">每一条投稿都会进入编辑核验队列；我们只在需要回复时使用你留下的邮箱。</p>
        <SubmissionForm />
      </main>
    </div>
  );
}
