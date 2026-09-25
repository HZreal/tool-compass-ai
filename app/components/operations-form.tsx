'use client';
import { useState, type FormEvent } from 'react';
import type { CatalogImportStatus } from '../lib/catalog-import';

export function OperationsForm({initialStatus}:{initialStatus:CatalogImportStatus}) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [status,setStatus]=useState(initialStatus);
  async function importCatalog() {
    setBusy(true);
    try {
      const response=await fetch('/api/admin/catalog-import',{method:'POST'});
      const result=await response.json() as Partial<CatalogImportStatus> & {error?:string;alreadyImported?:boolean};
      if (!response.ok) {setMessage(result.error ?? '导入失败');return;}
      if (typeof result.imported !== 'boolean' || typeof result.totalPublished !== 'number' || typeof result.domesticPublished !== 'number') throw new Error('导入结果不完整，请刷新页面核对');
      setStatus({imported:result.imported,totalPublished:result.totalPublished,domesticPublished:result.domesticPublished});
      setMessage(result.alreadyImported ? '这批资料已导入，无需重复操作。' : '核验资料导入成功，目录与标签已更新。');
    } catch(error) {setMessage(error instanceof Error ? error.message : '网络异常，请重试');} finally {setBusy(false);}
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
    <section><h2>官方资料导入</h2><p>补充 12 款国内产品、更新 6 款海外产品的官方资料。已由你编辑的记录会保留；同一批资料仅导入一次。</p><p>当前已发布 {status.totalPublished} 款工具，其中国内 {status.domesticPublished} 款。2026-09-05 资料包：{status.imported ? '已导入' : '待导入'}。</p><button className="button button--ink" disabled={busy || status.imported} onClick={importCatalog}>导入 2026-09-05 核验资料</button>{status.imported ? <p><a href="/discover?region=domestic">查看国内工具目录</a></p> : null}</section>
    <section><h2>下载备份</h2><p>备份包括工具、分类、场景、标签、投稿、外跳统计和审计记录；其中可能含投稿邮箱，请妥善保存。</p><a className="button button--paper" href="/api/admin/backup" download>下载完整 JSON 备份</a></section>
    <section><h2>恢复备份</h2><p>恢复将覆盖当前业务数据。请先下载当前备份，再选择同版本备份并输入 RESTORE TOOL COMPASS AI。恢复支持 5 MB / 4999 行以内的 MVP 备份，另预留一行恢复审计。</p><form onSubmit={restore}><label>备份文件<input required type="file" name="backup" accept=".json,application/json" /></label><label>恢复确认<input required name="confirmation" autoComplete="off" placeholder="RESTORE TOOL COMPASS AI" pattern="RESTORE TOOL COMPASS AI" /></label><button className="button button--red" disabled={busy} type="submit">确认覆盖并恢复</button></form></section>
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
