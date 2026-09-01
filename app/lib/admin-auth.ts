import type { ChatGPTUser } from "../chatgpt-auth";

export type AdminIdentity = Pick<ChatGPTUser, "userId" | "email">;

export class AdminAuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 503,
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export function authorizeAdminRequest(
  request: Request,
  adminUserId: string | undefined,
): AdminIdentity {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");

  if (!userId || !email) {
    throw new AdminAuthError("请先使用 ChatGPT 登录", 401);
  }
  assertAllowlistedUser(userId, adminUserId);

  return { userId, email };
}

export async function requireAdmin(request: Request): Promise<AdminIdentity> {
  const { env } = await import("cloudflare:workers");
  return authorizeAdminRequest(
    request,
    (env as typeof env & { ADMIN_USER_ID?: string }).ADMIN_USER_ID,
  );
}

export async function requireAdminPage(returnTo: string): Promise<ChatGPTUser> {
  const { requireChatGPTUser } = await import("../chatgpt-auth");
  const user = await requireChatGPTUser(returnTo);
  const { env } = await import("cloudflare:workers");
  assertAllowlistedUser(
    user.userId,
    (env as typeof env & { ADMIN_USER_ID?: string }).ADMIN_USER_ID,
  );
  return user;
}

export function adminAuthErrorResponse(error: unknown): Response | null {
  if (!(error instanceof AdminAuthError)) return null;

  return Response.json(
    { error: error.message },
    {
      status: error.status,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    },
  );
}

function assertAllowlistedUser(
  userId: string,
  adminUserId: string | undefined,
): void {
  if (!adminUserId) {
    throw new AdminAuthError("管理员身份尚未配置", 503);
  }
  if (userId !== adminUserId) {
    throw new AdminAuthError("无权访问管理后台", 403);
  }
}
