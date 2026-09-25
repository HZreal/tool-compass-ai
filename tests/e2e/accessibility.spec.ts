import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("primary navigation exposes all five destinations on narrow screens", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "主导航" });
  for (const [name, href] of [["首页", "/"], ["目录", "/discover"], ["搜索", "/search"], ["投稿", "/submit"], ["后台", "/admin"]]) {
    const link = nav.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", href);
    await link.focus();
    await link.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${href === "/" ? "/" : href}(?:\\?.*)?$`));
    await page.goto("/");
  }
});

for (const route of ["/", "/discover", "/search?q=ChatGPT", "/tool/chatgpt", "/submit", "/admin", "/admin/tools", "/admin/submissions"]) {
  test(`${route} has labeled controls, accessible contrast and no horizontal overflow`, async ({ page }) => {
    await page.goto(route);
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
