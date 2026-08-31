import assert from "node:assert/strict";
import test from "node:test";

async function renderHome() {
  const workerUrl = new URL("../../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the AI Scenery heading inside the main landmark", async () => {
  const response = await renderHome();
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<main[\s>][\s\S]*?<h1[^>]*>AI Scenery<\/h1>[\s\S]*?<\/main>/i);
});
