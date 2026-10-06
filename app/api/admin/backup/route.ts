import { adminAuthErrorResponse, authorizeAdminRequest, requireAdmin } from '../../../lib/admin-auth';
import { exportBackup, restoreBackup, MAX_BACKUP_BYTES } from '../../../lib/backup';
import type { D1Database } from '../../../lib/catalog';

const headers={'cache-control':'no-store'};
export async function createBackupResponse(db:D1Database, request:Request, adminUserId?:string):Promise<Response> {
  try {
    if(adminUserId===undefined) await requireAdmin(request); else authorizeAdminRequest(request,adminUserId);
    if(request.method==='GET') return Response.json(await exportBackup(db),{headers:{...headers,'content-disposition':'attachment; filename="tool-compass-ai-backup.json"'}});
    if(request.method!=='POST') return Response.json({error:'不支持的操作'},{status:405,headers});
    if(request.headers.get('origin') && request.headers.get('origin')!==new URL(request.url).origin) return Response.json({error:'不允许跨站恢复'},{status:403,headers});
    const text=await readBoundedBody(request,MAX_BACKUP_BYTES+1024);
    if(text===null) return Response.json({error:'备份超过 5 MB'},{status:413,headers});
    const payload=JSON.parse(text) as {confirmation?:string;backup?:unknown};
    if(payload.confirmation!=='RESTORE TOOL COMPASS AI') return Response.json({error:'请输入完整恢复确认文字'},{status:400,headers});
    await restoreBackup(db,payload.backup);
    return Response.json({restored:true},{headers});
  } catch(error) {
    const auth=adminAuthErrorResponse(error);if(auth)return auth;
    return Response.json({error: error instanceof SyntaxError ? '备份 JSON 无效' : '备份操作失败：请核对版本、字段、引用关系和数据量；数据库未提交不完整恢复。'},{status:400,headers});
  }
}
export async function GET(request:Request) {const {env}=await import('cloudflare:workers');return createBackupResponse(env.DB,request);}
export async function POST(request:Request) {const {env}=await import('cloudflare:workers');return createBackupResponse(env.DB,request);}

async function readBoundedBody(request:Request,limit:number):Promise<string|null> {
  if(Number(request.headers.get('content-length'))>limit)return null;
  const reader=request.body?.getReader();if(!reader)return '';
  const decoder=new TextDecoder();let size=0;let body='';
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();return null;}body+=decoder.decode(value,{stream:true});}return body+decoder.decode();}
  finally{reader.releaseLock();}
}
