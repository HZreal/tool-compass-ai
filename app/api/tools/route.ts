import { env } from "cloudflare:workers";

import { createToolsResponse } from "../../lib/public-api";

export async function GET(request: Request) {
  return createToolsResponse(env.DB, request);
}
