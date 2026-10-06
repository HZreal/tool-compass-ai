import { env } from "cloudflare:workers";

import { createSearchResponse } from "../../lib/public-api";

export async function GET(request: Request) {
  return createSearchResponse(env.DB, request);
}
