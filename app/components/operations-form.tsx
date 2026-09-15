'use client';
import { useState, type FormEvent } from 'react';

export function OperationsForm() {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function importCatalog() {
    setBusy(true);
    try {const response=await fetch('/api/admin/catalog-import',{method:'POST'});const result=await response.json() as {error?:string;alreadyImported?:boolean};setMessage(response.ok ? result.alreadyImported ? '这批资料已导入，无需重复操作。' : '已导入国内外核验资料，并同步标签。' : result.error ?? '导入失败');} catch {setMessage('网络异常，请重试');} finally {setBusy(false);}
  }
  async function restore(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);
    try {
      const form=new FormData(event.currentTarget); const file=form.get('backup');
      if(!(file instanceof File)||!file.size||file.size>5*1024*1024) throw new Error('请选择不超过 5 MB 的备份文件');
      const backup=JSON.parse(await file.text()) as unknown;
      const response=await fetch('/api/admin/backup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({confirmation:form.get('confirmation'),backup})});
      const result=await response.json() as {error?:string};
      setMessage(response.ok?'恢复成功，已记录恢复审计。':result.error??'恢复失败');
    }catch(error){setMessage(error instanceof Error?error.message:'恢复失败');}finally{setBusy(false);}
  }
  return <div className="admin-lede">
    <section><h2>官方资料导入</h2><p>补充 12 款国内产品、更新 6 款海外产品的官方资料。已由你编辑的记录会保留；同一批资料仅导入一次。</p><button className="button button--ink" disabled={busy} onClick={importCatalog}>导入 2026-09-05 核验资料</button></section>
    <section><h2>下载备份</h2><p>备份包括工具、分类、场景、标签、投稿、外跳统计和审计记录；其中可能含投稿邮箱，请妥善保存。</p><a className="button button--paper" href="/api/admin/backup" download>下载完整 JSON 备份</a></section>
    <section><h2>恢复备份</h2><p>恢复将覆盖当前业务数据。请先下载当前备份，再选择同版本备份并输入 RESTORE TOOL COMPASS AI。恢复支持 5 MB / 4999 行以内的 MVP 备份，另预留一行恢复审计。</p><form onSubmit={restore}><label>备份文件<input required type="file" name="backup" accept=".json,application/json" /></label><label>恢复确认<input required name="confirmation" autoComplete="off" placeholder="RESTORE TOOL COMPASS AI" pattern="RESTORE TOOL COMPASS AI" /></label><button className="button button--red" disabled={busy} type="submit">确认覆盖并恢复</button></form></section>
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
