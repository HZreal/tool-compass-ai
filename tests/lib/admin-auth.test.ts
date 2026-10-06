import assert from "node:assert/strict";
import test from "node:test";

import {
  AdminAuthError,
  authorizeAdminRequest,
} from "../../app/lib/admin-auth";
import { LOCAL_ADMIN_COOKIE, LOCAL_DEV_ADMIN_USER_ID } from "../../app/lib/local-auth";

const ADMIN_USER_ID = "user-admin-001";

function requestWithIdentity(userId?: string, email?: string) {
  const headers = new Headers();
  if (userId) headers.set("oai-authenticated-user-id", userId);
  if (email) headers.set("oai-authenticated-user-email", email);
  return new Request("https://ai-scenery.test/api/admin/tools", { headers });
}

test("anonymous requests are rejected before admin operations run", () => {
  assert.throws(
    () => authorizeAdminRequest(requestWithIdentity(), ADMIN_USER_ID),
    (error) => error instanceof AdminAuthError && error.status === 401,
  );
});

test("a signed-in user with the administrator email but a different ID is rejected", () => {
  assert.throws(
    () =>
      authorizeAdminRequest(
        requestWithIdentity("user-someone-else", "editor@example.com"),
        ADMIN_USER_ID,
      ),
    (error) => error instanceof AdminAuthError && error.status === 403,
  );
});

test("the allowlisted ChatGPT user ID is accepted by exact comparison", () => {
  const user = authorizeAdminRequest(
    requestWithIdentity(ADMIN_USER_ID, "editor@example.com"),
    ADMIN_USER_ID,
  );

  assert.deepEqual(user, {
    userId: ADMIN_USER_ID,
    email: "editor@example.com",
  });
});

test("an empty admin allowlist never grants access", () => {
  assert.throws(
    () =>
      authorizeAdminRequest(
        requestWithIdentity(ADMIN_USER_ID, "editor@example.com"),
        "",
      ),
    (error) => error instanceof AdminAuthError && error.status === 503,
  );
});

test("localhost requests can use the local development admin cookie", () => {
  const request = new Request("http://localhost:3000/api/admin/tools", {
    headers: {
      cookie: `${LOCAL_ADMIN_COOKIE}=${LOCAL_DEV_ADMIN_USER_ID}`,
    },
  });

  assert.deepEqual(authorizeAdminRequest(request, undefined), {
    userId: LOCAL_DEV_ADMIN_USER_ID,
    email: "local-admin@localhost",
  });
});

test("the local development admin cookie is ignored outside localhost", () => {
  const request = new Request("https://ai-scenery.test/api/admin/tools", {
    headers: {
      cookie: `${LOCAL_ADMIN_COOKIE}=${LOCAL_DEV_ADMIN_USER_ID}`,
    },
  });

  assert.throws(
    () => authorizeAdminRequest(request, undefined),
    (error) => error instanceof AdminAuthError && error.status === 401,
  );
});
