# Tool Compass AI MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and privately deploy an editor-maintained AI tool discovery site with task-based discovery, D1 full-text search, public submissions and one ChatGPT-authenticated administrator.

**Architecture:** A React/TypeScript VINext application runs on Sites as a Cloudflare Worker. Public pages and API routes query D1 for published data; protected Worker routes enforce a server-side single-user allowlist; D1 FTS5 performs search and generated Drizzle migrations travel with each deployment.

**Tech Stack:** React, TypeScript, Vite, VINext, Sites, Cloudflare Workers, Cloudflare D1/SQLite, Drizzle ORM, Zod, FTS5, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-tool-compass-ai-mvp-design.md`; `docs/superpowers/specs/2026-08-31-tool-compass-ai-technical-design.md`

## Global Constraints

- Use the Sites-generated VINext project and Cloudflare Worker-compatible ESM output.
- D1 is the authoritative store; no browser storage may retain product data.
- Do not add Go/Gin, Docker, user accounts, third-party CMS, vector search, R2 or an external search service.
- Public queries expose published tools only; `ADMIN_USER_ID` is a Sites secret, never client code or D1 data.
- Every tool website link uses `/go/:slug`, opens in a new tab and records no personal data.
- All public screens work at 360px and support keyboard navigation.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `app/page.tsx` and public route directories | Homepage, directory, scene, search, detail and submission pages. |
| `app/admin/*` | ChatGPT-authenticated editor UI. |
| `app/api/*` and `app/go/*` | Worker API and outbound redirect handlers. |
| `app/lib/catalog.ts` | Typed published/admin catalog queries. |
| `app/lib/search.ts` | FTS5 query construction and ranking. |
| `app/lib/validation.ts` | Shared Zod schemas. |
| `app/lib/admin-auth.ts` | Server-side ChatGPT identity and allowlist verification. |
| `drizzle/schema.ts`, `drizzle/*.sql` | Drizzle schema and D1 migrations packaged by Sites. |
| `tests/*` | Unit, route and browser coverage. |

### Task 1: Initialize the Sites application shell

**Files:**
- Create: Sites-generated `app/`, `public/`, `.openai/hosting.json`, package manifest and lockfile
- Modify: `app/layout.tsx`, `app/globals.css`, `.openai/hosting.json`
- Test: `tests/smoke/app-shell.test.tsx`

**Interfaces:**
- Produces: a running app with `GET /`, a local preview and production build.

- [ ] Initialize exactly one Sites VINext project in the workspace and keep its development session available.
- [ ] Replace starter metadata with title `Tool Compass AI` and description `按真实任务发现值得使用的 AI 工具`.
- [ ] Write a failing shell test asserting the main landmark contains a `Tool Compass AI` heading.
- [ ] Implement the minimal responsive shell and run the test until it passes.
- [ ] Declare D1 binding `DB` in `.openai/hosting.json`; leave R2 unset.
- [ ] Run the production build and commit `chore: initialize Tool Compass AI site`.

### Task 2: Create and seed the D1 catalog

**Files:**
- Create: `drizzle/schema.ts`, `drizzle/0000_catalog.sql`, `db/seed.ts`
- Create: `app/lib/db.ts`, `tests/db/catalog-schema.test.ts`

**Interfaces:**
- Produces: `ToolStatus`, `CatalogTool`, `listPublishedTools(filters)` and an idempotent seed command.
- Consumes: Worker environment binding `DB: D1Database`.

- [ ] Write failing tests that seed twice and assert eight unique categories, six scenes, 80 unique tool slugs and no duplicate relationship rows.
- [ ] Define D1 tables, unique indexes, relation tables, FTS5 trigram virtual table and sync triggers in the Sites-packaged migration.
- [ ] Generate and inspect the Drizzle migration; use SQL-expression timestamps so schema and migration defaults match.
- [ ] Implement an idempotent seed with globally valuable, mature, verified tools and their categories/scenes.
- [ ] Run schema and seed tests against local D1, inspect FTS query plans, then commit `feat: add catalog schema and seed data`.

### Task 3: Implement catalog/search Worker queries and public APIs

**Files:**
- Create: `app/lib/catalog.ts`, `app/lib/search.ts`, `app/api/tools/route.ts`, `app/api/search/route.ts`
- Create: `tests/lib/catalog.test.ts`, `tests/api/search.test.ts`

**Interfaces:**
- Produces: `listPublishedTools(filters)`, `searchPublishedTools(query, page)`, `getPublishedTool(slug)` and read-only API endpoints.
- Consumes: D1 binding and validated filter parameters.

- [ ] Write failing tests for published-only visibility, multi-filter intersection, 18-item pagination, Chinese/English alias FTS match and empty search results.
- [ ] Implement one-statement prepared D1 queries with bound parameters only.
- [ ] Return `null` for unknown/archived slugs and related scene suggestions for no results.
- [ ] Run unit tests and verify representative queries use intended indexes; commit `feat: add catalog browsing and search APIs`.

### Task 4: Build the public discovery interface

**Files:**
- Create: `app/discover/page.tsx`, `app/search/page.tsx`, `app/scene/[slug]/page.tsx`, `app/tool/[slug]/page.tsx`
- Create: `app/components/search-box.tsx`, `app/components/filter-panel.tsx`, `app/components/tool-card.tsx`, `app/components/tool-grid.tsx`
- Modify: `app/page.tsx`, `app/globals.css`
- Test: `tests/routes/discovery.test.tsx`, `tests/e2e/discovery.spec.ts`

**Interfaces:**
- Consumes: catalog/search services from Task 3.
- Produces: homepage → scene/category/search → tool-detail discovery flow.

- [ ] Write failing route tests for published card rendering, URL-synchronized filters, unknown route 404 and recommended discovery links on no-result state.
- [ ] Implement the approved homepage, discovery, search, scene and detail screens with real seed data.
- [ ] Ensure cards show name, summary, pricing, tags and verified date; detail shows editorial note, platform/language and related tools.
- [ ] Write Playwright desktop and 360px journeys from homepage search to tool detail.
- [ ] Run route/browser tests and commit `feat: add public discovery experience`.

### Task 5: Add submissions and outbound tracking

**Files:**
- Create: `app/submit/page.tsx`, `app/api/submissions/route.ts`, `app/go/[slug]/route.ts`, `app/lib/validation.ts`
- Create: `app/components/submission-form.tsx`, `tests/routes/submission.test.ts`

**Interfaces:**
- Produces: `POST /api/submissions`, `GET /go/:slug` and `SubmissionInput`.
- Consumes: D1 catalog/submission tables and Zod input schemas.

- [ ] Write failing tests for valid recommendation/correction, invalid non-HTTPS URL rejection, honeypot silent success without persistence and a redirect event without IP data.
- [ ] Define Zod schemas using the exact limits in the technical design.
- [ ] Implement form, confirmation state, submissions insert and 302 redirect handler.
- [ ] Verify detail links use `target="_blank"` and `/go/:slug`; run tests and commit `feat: add submissions and outbound tracking`.

### Task 6: Add ChatGPT-authenticated single-admin operations

**Files:**
- Create: `app/chatgpt-auth.ts`, `app/lib/admin-auth.ts`, `app/admin/page.tsx`, `app/admin/tools/page.tsx`, `app/admin/submissions/page.tsx`
- Create: `app/api/admin/tools/route.ts`, `app/api/admin/submissions/route.ts`, `app/components/admin/tool-form.tsx`
- Test: `tests/lib/admin-auth.test.ts`, `tests/routes/admin.test.tsx`

**Interfaces:**
- Produces: `requireAdmin(request)`, protected catalog mutation APIs and editor pages.
- Consumes: Sites ChatGPT identity helper, `ADMIN_USER_ID` and D1.

- [ ] Write failing tests for anonymous rejection, signed-in non-admin rejection, matching allowlisted user acceptance, draft privacy and publish visibility.
- [ ] Implement server-only identity lookup and exact user ID comparison; do not authorize based on the client or email alone.
- [ ] Implement draft/create/edit/publish/archive, submission approve/reject and audit-event writes.
- [ ] Build concise editor lists and forms; do not create user/role management screens.
- [ ] Run auth/admin tests and commit `feat: add single-admin editorial workspace`.

### Task 7: Validate, back up and deploy through Sites

**Files:**
- Modify: `.openai/hosting.json`, `app/layout.tsx`, all production routes
- Create: `tests/e2e/accessibility.spec.ts`, `docs/operations.md`

**Interfaces:**
- Produces: a private deployed MVP with documented restore/export and publish procedures.

- [ ] Write failing browser tests for keyboard search, visible focus, 360px overflow absence and publish-to-public visibility.
- [ ] Add five-minute cache headers only to public GET reads; bypass cache for `/admin` and write endpoints; invalidate affected public reads after mutations.
- [ ] Document D1 export/restore, required Sites secrets, monthly review and cache-invalidation operations without recording secret values.
- [ ] Run unit, route, E2E and deployment builds; fix failures and rerun.
- [ ] Save a Sites version with migrations, privately deploy, test discovery/submission/admin against it, then request explicit approval before public deployment; commit `feat: release Tool Compass AI MVP`.
