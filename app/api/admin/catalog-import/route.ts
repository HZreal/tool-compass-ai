import { requireAdmin, authorizeAdminRequest, adminAuthErrorResponse } from '../../../lib/admin-auth';
import { importReviewedCatalog } from '../../../lib/catalog-import';
import type { D1Database } from '../../../lib/catalog';

export async function createCatalogImportResponse(db: D1Database, request: Request, adminUserId?: string) {
  try {
    if (adminUserId === undefined) await requireAdmin(request); else authorizeAdminRequest(request, adminUserId);
    if (request.method !== 'POST') return Response.json({error:'使用 POST 导入'}, {status:405, headers:{'cache-control':'no-store'}});
    if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'不允许跨站请求'}, {status:403,headers:{'cache-control':'no-store'}});
    return Response.json(await importReviewedCatalog(db), {headers:{'cache-control':'no-store'}});
  } catch(error) {
    const authError=adminAuthErrorResponse(error); if (authError) return authError;
    return Response.json({error:'导入未完成，请检查迁移状态或稍后重试。'}, {status:409,headers:{'cache-control':'no-store'}});
  }
}
export async function POST(request: Request) {
  const {env}=await import('cloudflare:workers');
  return createCatalogImportResponse(env.DB,request);
}
