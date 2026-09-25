export const LOCAL_ADMIN_COOKIE = "ai_scenery_local_admin";
export const LOCAL_DEV_ADMIN_USER_ID = "local-admin";
export const LOCAL_DEV_ADMIN_EMAIL = "local-admin@localhost";

export function isLocalDevelopmentHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function localDevelopmentUserIdFromCookie(
  cookieHeader: string | null,
  hostname: string,
): string | null {
  if (!isLocalDevelopmentHost(hostname) || !cookieHeader) return null;

  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${LOCAL_ADMIN_COOKIE}=`));
  if (!cookie) return null;

  const value = cookie.slice(LOCAL_ADMIN_COOKIE.length + 1);
  return value === encodeURIComponent(LOCAL_DEV_ADMIN_USER_ID)
    ? LOCAL_DEV_ADMIN_USER_ID
    : null;
}

export function safeLocalReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (url.pathname === "/signin-with-chatgpt" || url.pathname === "/signout-with-chatgpt" || url.pathname === "/callback") {
    return "/";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
