"use client";

import { useState, type FormEvent } from "react";

export function SubmissionReviewForm({ id, canConvert = true }: { id: number; canConvert?: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const decision = submitter?.value;
    if (decision !== "approved" && decision !== "rejected" && decision !== "convert") return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
    const response = await fetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, decision, reviewNote: String(form.get("reviewNote") ?? "") }),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(response.ok ? "审核结果已保存" : result.error ?? "审核失败");
    if (response.ok) window.location.reload();
    } catch { setMessage("网络异常，请重试；审核说明仍保留。"); }
    finally { setBusy(false); }
  }

  return (
    <form className="admin-review-form" action="/api/admin/submissions" method="post" onSubmit={review}>
      <label>审核说明<textarea name="reviewNote" required maxLength={1000} rows={2} /></label>
      <div className="admin-form-actions">
        <button className="button button--ink" type="submit" name="decision" value="approved" disabled={busy}>批准</button>
        <button className="button button--paper" type="submit" name="decision" value="rejected" disabled={busy}>拒绝</button>
        {canConvert ? <button className="button button--red" type="submit" name="decision" value="convert" disabled={busy}>转为工具草稿</button> : null}
        {message ? <output aria-live="polite">{message}</output> : null}
      </div>
    </form>
  );
}
