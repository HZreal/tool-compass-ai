import assert from "node:assert/strict";
import test from "node:test";

import { signInPathForHost } from "../../app/lib/local-auth";

test("local sign-in uses an app-owned path without taking over the Sites auth path", () => {
  assert.equal(signInPathForHost("/admin", "localhost"), "/local-signin-with-chatgpt?return_to=%2Fadmin");
  assert.equal(signInPathForHost("/admin", "tool-compass-ai.elasticcode.chatgpt.site"), "/signin-with-chatgpt?return_to=%2Fadmin");
  assert.equal(signInPathForHost("https://elsewhere.example", "localhost"), "/local-signin-with-chatgpt?return_to=%2F");
  assert.equal(signInPathForHost("/local-signin-with-chatgpt", "localhost"), "/local-signin-with-chatgpt?return_to=%2F");
});
