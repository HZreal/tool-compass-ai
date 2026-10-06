"use client";

import { useState, type FormEvent } from "react";
import type { TaxonomyKind, TaxonomyRecord } from "../../lib/taxonomy";

export function TaxonomyForm({ kind, item }: { kind: TaxonomyKind; item?: TaxonomyRecord }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function mutate(method: "POST" | "PATCH" | "DELETE", fields: object) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/taxonomy", { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, ...(item ? { id: item.id } : {}), ...fields }) });
      const result = await response.json() as { error?: string };
      if (response.ok) { setMessage("已保存"); window.location.reload(); }
      else setMessage(result.error ?? "操作失败");
    } catch { setMessage("网络异常，请重试；已填写内容仍保留。"); }
    finally { setBusy(false); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void mutate(item ? "PATCH" : "POST", {
      slug: String(form.get("slug") ?? ""), name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""), sortOrder: Number(form.get("sortOrder") ?? 0),
    });
  }
  return <form className="admin-tool-form" action="/api/admin/taxonomy" method="post" onSubmit={save}>
    <div className="admin-form-grid">
      <label>名称<input name="name" required maxLength={80} defaultValue={item?.name} /></label>
      <label>Slug<input name="slug" required maxLength={500} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={item?.slug} /></label>
      <label className="admin-span-2">描述<textarea name="description" maxLength={1000} rows={2} defaultValue={item?.description} /></label>
      <label>排序（越小越靠前）<input name="sortOrder" type="number" required min={-1000000} max={1000000} step={1} defaultValue={item?.sortOrder ?? 0} /></label>
    </div>
    <div className="admin-form-actions">
      <button type="submit" className="button button--ink" disabled={busy}>{item ? "保存修改" : "新增条目"}</button>
      {item ? <button type="button" className="button button--paper" disabled={busy || (kind !== "tags" && item.toolCount > 0)} onClick={() => {
        if (window.confirm(`删除「${item.name}」？${kind === "tags" ? "关联工具会移除此标签。" : "此操作不可撤销。"}`)) void mutate("DELETE", {});
      }}>删除</button> : null}
      {item ? <small>{item.toolCount} 个工具引用{kind !== "tags" && item.toolCount > 0 ? "；先解除引用才能删除" : ""}</small> : null}
      {message ? <output aria-live="polite">{message}</output> : null}
    </div>
  </form>;
}
