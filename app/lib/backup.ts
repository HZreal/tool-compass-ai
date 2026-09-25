import type { D1Database } from './catalog';

export const BACKUP_TABLES = ['catalog_imports','categories','scenes','tags','tools','tool_categories','tool_scenes','tool_tags','submissions','outbound_events','admin_audit_events'] as const;
type Cell = string | number | null;
type Row = Record<string, Cell>;
export type Backup = { format: 'ai-scenery-backup'; version: 1; schemaVersion: 8; exportedAt: string; tables: Record<string, Row[]> };
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

async function columnsFor(db: D1Database) {
  const columns: Record<string,string[]> = {};
  for (const table of BACKUP_TABLES) {
    const result=await db.prepare(`PRAGMA table_info("${table}")`).bind().all<{name:string}>();
    columns[table]=result.results.map(row=>row.name);
    if (!columns[table].length || columns[table].some(name=> !/^[a-z_]+$/.test(name))) throw new Error('数据库结构不兼容，请先完成迁移');
  }
  return columns;
}

export async function exportBackup(db: D1Database): Promise<Backup> {
  const columns=await columnsFor(db);
  // A single SELECT establishes one SQLite read snapshot across every table.
  const entries=BACKUP_TABLES.map(table => `'${table}', (SELECT json_group_array(json_object(${columns[table].map(col=>`'${col}',"${col}"`).join(',')})) FROM "${table}")`);
  const result=await db.prepare(`SELECT json_object(${entries.join(',')}) AS snapshot`).bind().first<{snapshot:string}>();
  if (!result) throw new Error('读取备份失败');
  const backup:Backup={format:'ai-scenery-backup',version:1,schemaVersion:8,exportedAt:new Date().toISOString(),tables:JSON.parse(result.snapshot)};
  validateBackup(backup, columns);
  return backup;
}

function validateBackup(value: unknown, columns: Record<string,string[]>): asserts value is Backup {
  if (!value || typeof value!=='object') throw new Error('备份格式无效');
  const backup=value as Backup;
  if (backup.format!=='ai-scenery-backup' || backup.version!==1 || backup.schemaVersion!==8 || !backup.tables || typeof backup.tables!=='object') throw new Error('备份版本不兼容');
  if (new TextEncoder().encode(JSON.stringify(backup)).byteLength > MAX_BACKUP_BYTES) throw new Error('备份超过 5 MB 限制');
  if (Object.keys(backup.tables).sort().join(',') !== [...BACKUP_TABLES].sort().join(',')) throw new Error('备份表不完整');
  let count=0;
  for (const table of BACKUP_TABLES) {
    const rows=backup.tables[table];
    if (!Array.isArray(rows)) throw new Error('备份记录格式无效');
    count+=rows.length;
    for(const row of rows) {
      if (!row || typeof row!=='object' || Object.keys(row).sort().join(',')!==[...columns[table]].sort().join(',')) throw new Error('备份字段不匹配');
      if(Object.values(row).some(v=>v!==null && typeof v!=='string' && (typeof v!=='number' || !Number.isFinite(v)))) throw new Error('备份值格式无效');
    }
  }
  if(count>5000) throw new Error('备份超过 5000 行限制，请使用托管数据库导出流程');
  const integerFields=new Set(['id','sort_order','tool_id','category_id','scene_id','tag_id','converted_tool_id','featured','featured_rank','resource_id']);
  const nullableFields=new Set(['logo_url','featured_rank','email','review_note','reviewed_at','converted_tool_id']);
  const ids:Record<string,Set<Cell>>={};
  for(const table of BACKUP_TABLES) {
    ids[table]=new Set();
    const primaryKeys=new Set<string>();
    for(const row of backup.tables[table]) {
      for(const [field,value] of Object.entries(row)) {
        if(value===null) {if(!nullableFields.has(field))throw new Error('非空字段缺失');continue;}
        if(integerFields.has(field) && !(table==='catalog_imports' && field==='id')) {
          if(typeof value!=='number'||!Number.isSafeInteger(value))throw new Error('整数类型无效');
        } else if(typeof value!=='string') throw new Error('文本类型无效');
      }
      const key=JSON.stringify(row.id??[row.tool_id,row.category_id??row.scene_id??row.tag_id]);
      if(primaryKeys.has(key))throw new Error('备份包含重复主键');
      primaryKeys.add(key);ids[table].add(row.id);
    }
  }
  for(const [table,field,target] of [
    ['tool_categories','tool_id','tools'],['tool_categories','category_id','categories'],
    ['tool_scenes','tool_id','tools'],['tool_scenes','scene_id','scenes'],
    ['tool_tags','tool_id','tools'],['tool_tags','tag_id','tags'],
    ['outbound_events','tool_id','tools'],['submissions','converted_tool_id','tools'],
  ]) for(const row of backup.tables[table]) if(row[field]!==null && !ids[target].has(row[field]))throw new Error('备份包含孤立引用');
  for(const row of backup.tables.submissions) if(!safeHttps(String(row.website_url)))throw new Error('投稿网址必须是 HTTPS');
  for(const tool of backup.tables.tools) {
    for(const field of ['tags','aliases','platforms','languages','sources']) {
      const values:unknown=JSON.parse(String(tool[field]));
      if(!Array.isArray(values)||values.some(v=>typeof v!=='string')) throw new Error('工具数组字段无效');
      if(field==='sources' && values.some(v=>!safeHttps(v))) throw new Error('来源必须是 HTTPS');
    }
    if(tool.website_url && !safeHttps(String(tool.website_url))) throw new Error('工具网址必须是 HTTPS');
    if(tool.logo_url && !safeHttps(String(tool.logo_url)))throw new Error('Logo 网址必须是 HTTPS');
    if(tool.status==='published' && (!tool.name || !tool.description || !tool.website_url)) throw new Error('已发布工具资料不完整');
    if(tool.status==='published' && (!tool.pricing || !tool.verified_at || !backup.tables.tool_categories.some(row=>row.tool_id===tool.id) || !backup.tables.tool_scenes.some(row=>row.tool_id===tool.id)))throw new Error('发布工具缺少定价、核验日期、分类或场景');
  }
  const tagNames=new Map(backup.tables.tags.map(row=>[row.id,row.name]));
  for (const tool of backup.tables.tools) {
    const expected=new Set(JSON.parse(String(tool.tags)) as string[]);
    const actual=new Set(backup.tables.tool_tags.filter(row=>row.tool_id===tool.id).map(row=>tagNames.get(row.tag_id)));
    if(expected.size!==actual.size || [...expected].some(name=>!actual.has(name))) throw new Error('备份标签关系不一致，请先同步标签后重新导出');
  }
}

function safeHttps(value:string) {
  try { const url=new URL(value);return url.protocol==='https:' && !url.username && !url.password; } catch {return false;}
}

export async function restoreBackup(db: D1Database, value:unknown) {
  const columns=await columnsFor(db);
  validateBackup(value, columns);
  // Leave room for the restore audit so a successful restore is exportable.
  if(Object.values(value.tables).reduce((sum,rows)=>sum+rows.length,0)>=5000)throw new Error('恢复上限为 4999 行，需预留恢复审计记录');
  const statements=[...BACKUP_TABLES].reverse().map(table=>db.prepare(`DELETE FROM "${table}"`));
  for(const table of BACKUP_TABLES) {
    for(const row of value.tables[table]) {
      // Tool INSERT triggers already recreate normalized tag links.
      if(table==='tool_tags') continue;
      statements.push(db.prepare(`INSERT INTO "${table}" (${columns[table].map(col=>`"${col}"`).join(',')}) VALUES (${columns[table].map(()=>'?').join(',')})`).bind(...columns[table].map(col=>row[col])));
    }
  }
  statements.push(db.prepare("INSERT INTO admin_audit_events(action,resource_type,resource_id) VALUES ('backup.restore','database',0)"));
  await db.batch(statements);
}
