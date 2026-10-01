import {
  isLocalDevelopmentHost,
  LOCAL_ADMIN_COOKIE,
  LOCAL_DEV_ADMIN_USER_ID,
  safeLocalReturnPath,
} from "../lib/local-auth";

export function createLocalChatGPTSignInResponse(request: Request): Response {
  const url = new URL(request.url);
  if (!isLocalDevelopmentHost(url.hostname)) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      "cache-control": "no-store",
      location: safeLocalReturnPath(url.searchParams.get("return_to")),
      "set-cookie": `${LOCAL_ADMIN_COOKIE}=${LOCAL_DEV_ADMIN_USER_ID}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    },
  });
}

export function GET(request: Request) {
  return createLocalChatGPTSignInResponse(request);
}
