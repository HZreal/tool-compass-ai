import { expect, test } from "@playwright/test";

test("homepage search reaches a verified tool detail without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "AI Scenery" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "搜索 AI 工具" }).last();
  await search.focus();
  await search.fill("ChatGPT");
  await search.press("Enter");

  await expect(page).toHaveURL(/\/search\?q=ChatGPT$/);
  await expect(page.getByRole("heading", { name: "关于“ChatGPT”" })).toBeVisible();
  await page.getByRole("link", { name: "ChatGPT", exact: true }).click();

  await expect(page).toHaveURL(/\/tool\/chatgpt$/);
  await expect(page.getByRole("heading", { level: 1, name: "ChatGPT" })).toBeVisible();
  await expect(page.getByText("A versatile default for writing, analysis, coding, and multimodal tasks.")).toBeVisible();
  await expect(page.getByText("2026-08-31 核验")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("unknown tool route returns a not-found response", async ({ page }) => {
  const response = await page.goto("/tool/does-not-exist");
  expect(response?.status()).toBe(404);
});
