// Bindings supplied by the Sites control plane; no account-specific IDs belong here.
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
    ADMIN_USER_ID?: string;
  }
}
