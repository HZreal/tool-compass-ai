import { expect, test } from "@playwright/test";

test("homepage search reaches a verified tool detail without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Tool Compass AI" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "搜索 AI 工具" }).last();
  await search.focus();
  await search.fill("ChatGPT");
  await search.press("Enter");

  await expect(page).toHaveURL(/\/search\?q=ChatGPT$/);
  await expect(page.getByRole("heading", { name: "关于“ChatGPT”" })).toBeVisible();
  await page.getByRole("link", { name: "ChatGPT", exact: true }).click();

  await expect(page).toHaveURL(/\/tool\/chatgpt$/);
  await expect(page.getByRole("heading", { level: 1, name: "ChatGPT" })).toBeVisible();
  await expect(page.getByRole("region", { name: "编辑说明" }).locator("blockquote")).toHaveText(/\S+/);
  await expect(page.locator(".tool-detail__hero time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByRole("link", { name: "官方资料 1", exact: true })).toHaveAttribute("href", "https://chatgpt.com/pricing/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("unknown tool route returns a not-found response", async ({ page }) => {
  const response = await page.goto("/tool/does-not-exist");
  expect(response?.status()).toBe(404);
});

test("unknown scene route returns a not-found response", async ({ page }) => {
  const response = await page.goto("/scene/does-not-exist");
  expect(response?.status()).toBe(404);
});

test("directory filters submit their current state in the URL", async ({ page }) => {
  await page.goto("/discover?q=ChatGPT");

  await page.getByLabel("分类").selectOption("chat-assistant");
  await page.getByLabel("任务场景").selectOption("writing");
  await page.getByRole("button", { name: "应用筛选" }).click();

  await expect(page).toHaveURL(/\/discover\?q=ChatGPT&region=&category=chat-assistant&scene=writing&platform=&pricing=$/);
});

test("Tab reaches the search field with a visible keyboard focus indicator", async ({ page }) => {
  await page.goto("/");

  const search = page.getByRole("searchbox", { name: "搜索 AI 工具" }).filter({ visible: true }).first();
  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press("Tab");
    if (await search.evaluate((element) => element === document.activeElement)) break;
  }
  await expect(search).toBeFocused();
  expect(await search.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe("3px");
});
