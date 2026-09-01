import assert from "node:assert/strict";
import test from "node:test";

import { createLocalChatGPTSignInResponse } from "../../app/signin-with-chatgpt/route";
import { LOCAL_ADMIN_COOKIE, LOCAL_DEV_ADMIN_USER_ID } from "../../app/lib/local-auth";

test("local ChatGPT sign-in route sets a development admin cookie and returns safely", () => {
  const response = createLocalChatGPTSignInResponse(
    new Request("http://localhost:3000/signin-with-chatgpt?return_to=%2Fadmin"),
  );

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/admin");
  assert.match(
    response.headers.get("set-cookie") ?? "",
    new RegExp(`${LOCAL_ADMIN_COOKIE}=${LOCAL_DEV_ADMIN_USER_ID}`),
  );
});

test("local ChatGPT sign-in route rejects non-local hosts and unsafe return paths", () => {
  assert.equal(
    createLocalChatGPTSignInResponse(
      new Request("https://ai-scenery.test/signin-with-chatgpt?return_to=%2Fadmin"),
    ).status,
    404,
  );

  assert.equal(
    createLocalChatGPTSignInResponse(
      new Request("http://localhost:3000/signin-with-chatgpt?return_to=https%3A%2F%2Fevil.example"),
    ).headers.get("location"),
    "/",
  );
});
