"use client";

import { useState, type FormEvent } from "react";

import type { AdminToolRecord } from "../../lib/admin-data";

type TaxonomyOption = { slug: string; name: string };

type ToolFormProps = {
  tool?: AdminToolRecord;
  categories: TaxonomyOption[];
  scenes: TaxonomyOption[];
};

export function ToolForm({ tool, categories, scenes }: ToolFormProps) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const editing = Boolean(tool);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      slug: text(form, "slug"),
      name: text(form, "name"),
      description: text(form, "description"),
      websiteUrl: text(form, "websiteUrl"),
      pricing: text(form, "pricing"),
      tags: list(form, "tags"),
      verifiedAt: text(form, "verifiedAt"),
      editorialNote: text(form, "editorialNote"),
      platforms: list(form, "platforms"),
      languages: list(form, "languages"),
      featured: form.get("featured") === "on",
      categorySlugs: form.getAll("categorySlugs").map(String),
      sceneSlugs: form.getAll("sceneSlugs").map(String),
    };

    const response = await fetch("/api/admin/tools", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editing ? { id: tool!.id, action: "edit", tool: payload } : payload),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(response.ok ? (editing ? "修改已保存" : "草稿已创建") : result.error ?? "保存失败");
    setBusy(false);
    if (response.ok) window.location.reload();
  }

  async function changeStatus(action: "publish" | "archive") {
    if (!tool) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/tools", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: tool.id, action }),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(response.ok ? (action === "publish" ? "已发布" : "已归档") : result.error ?? "操作失败");
    setBusy(false);
    if (response.ok) window.location.reload();
  }

  const selectedCategories = new Set(tool?.categorySlugs ?? tool?.categories ?? []);
  const selectedScenes = new Set(tool?.sceneSlugs ?? tool?.scenes ?? []);

  return (
    <form className="admin-tool-form" action="/api/admin/tools" method="post" onSubmit={save}>
      <div className="admin-form-grid">
        <label>名称<input name="name" required maxLength={80} defaultValue={tool?.name} /></label>
        <label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={tool?.slug} /></label>
        <label className="admin-span-2">简介<textarea name="description" required minLength={20} maxLength={160} rows={3} defaultValue={tool?.description} /></label>
        <label className="admin-span-2">官网<input name="websiteUrl" type="url" required pattern="https://.*" defaultValue={tool?.websiteUrl} /></label>
        <label>定价<input name="pricing" required defaultValue={tool?.pricing} /></label>
        <label>核验日期<input name="verifiedAt" type="date" required defaultValue={tool?.verifiedAt} /></label>
        <label>标签（逗号分隔）<input name="tags" defaultValue={tool?.tags.join(", ")} /></label>
        <label>平台（逗号分隔）<input name="platforms" defaultValue={tool?.platforms.join(", ")} /></label>
        <label>语言（逗号分隔）<input name="languages" defaultValue={tool?.languages.join(", ")} /></label>
        <label className="admin-check"><input name="featured" type="checkbox" defaultChecked={tool?.featured} /> 编辑精选</label>
        <label className="admin-span-2">编辑说明<textarea name="editorialNote" rows={3} maxLength={1000} defaultValue={tool?.editorialNote} /></label>
      </div>
      <fieldset>
        <legend>分类</legend>
        <div className="admin-option-grid">{categories.map((category) => (
          <label key={category.slug}><input type="checkbox" name="categorySlugs" value={category.slug} defaultChecked={selectedCategories.has(category.slug)} /> {category.name}</label>
        ))}</div>
      </fieldset>
      <fieldset>
        <legend>场景</legend>
        <div className="admin-option-grid">{scenes.map((scene) => (
          <label key={scene.slug}><input type="checkbox" name="sceneSlugs" value={scene.slug} defaultChecked={selectedScenes.has(scene.slug)} /> {scene.name}</label>
        ))}</div>
      </fieldset>
      <div className="admin-form-actions">
        <button className="button button--ink" type="submit" disabled={busy}>{editing ? "保存修改" : "创建草稿"}</button>
        {tool && tool.status !== "published" ? <button className="button button--red" type="button" disabled={busy} onClick={() => changeStatus("publish")}>发布</button> : null}
        {tool && tool.status !== "archived" ? <button className="button button--paper" type="button" disabled={busy} onClick={() => changeStatus("archive")}>归档</button> : null}
        {message ? <output aria-live="polite">{message}</output> : null}
      </div>
    </form>
  );
}

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function list(form: FormData, key: string) {
  return text(form, key).split(/[,，]/).map((item) => item.trim()).filter(Boolean);
}
