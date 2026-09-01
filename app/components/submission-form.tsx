"use client";

import { FormEvent, useState } from "react";

type SubmissionType = "recommendation" | "correction";

export function SubmissionForm() {
  const [type, setType] = useState<SubmissionType>("recommendation");
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    if (response.ok) {
      setState("success");
      return;
    }
    const body = await response.json().catch(() => null) as { error?: string } | null;
    setError(body?.error ?? "提交失败，请稍后重试。");
    setState("error");
  }

  if (state === "success") {
    return <section className="submission-confirmation" role="status"><p className="section-kicker">已收到</p><h2>感谢你的贡献。</h2><p>编辑会核验信息后决定是否收录或更新资料。</p></section>;
  }

  return (
    <form className="submission-form" onSubmit={submit}>
      <fieldset>
        <legend>投稿类型</legend>
        <label><input type="radio" name="type" value="recommendation" checked={type === "recommendation"} onChange={() => setType("recommendation")} /> 推荐新工具</label>
        <label><input type="radio" name="type" value="correction" checked={type === "correction"} onChange={() => setType("correction")} /> 纠正已有资料</label>
      </fieldset>
      <label>工具名称<input name="toolName" required minLength={1} maxLength={80} /></label>
      <label>官网地址<input name="websiteUrl" type="url" required placeholder="https://example.com" /></label>
      <label>说明<textarea name="message" required maxLength={2000} rows={6} placeholder={type === "recommendation" ? "它适合解决什么问题？" : "哪些资料需要更新？"} /></label>
      <label>邮箱（可选）<input name="email" type="email" autoComplete="email" /></label>
      <label className="honeypot" aria-hidden="true">公司名称<input name="company" tabIndex={-1} autoComplete="off" /></label>
      {state === "error" && <p className="form-error" role="alert">{error}</p>}
      <button className="button button--red" type="submit" disabled={state === "submitting"}>{state === "submitting" ? "正在提交…" : "提交给编辑部"}</button>
    </form>
  );
}
