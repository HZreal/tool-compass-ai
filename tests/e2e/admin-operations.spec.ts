import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function saveAndReload(page: Page, button: Locator) {
  await Promise.all([page.waitForEvent("load"), button.click()]);
}

async function expectSorted(region: Locator) {
  const positions = await region.locator("details > summary > span:first-child").allTextContents();
  const orders = positions.map((text) => Number(text.replace("顺序 ", "")));
  expect(orders).toEqual([...orders].sort((left, right) => left - right));
}

test.describe("administrator editorial operations", () => {
  test.setTimeout(90_000);

  test("taxonomy CRUD persists names and sorting for categories, scenes and tags", async ({ page }, testInfo) => {
    const token = `${testInfo.project.name}-${Date.now()}`;
    await page.goto("/admin/taxonomy");
    for (const [kind, label] of [["category", "分类"], ["scene", "场景"], ["tag", "标签"]]) {
      const name = `验收${label}-${token}`;
      const updatedName = `${name}-改`;
      const region = page.getByRole("region", { name: `${label}管理`, exact: true });
      const create = region.locator("details").filter({ has: page.locator("summary", { hasText: `新增${label}` }) });
      await create.locator("summary").click();
      await create.getByLabel("名称", { exact: true }).fill(name);
      await create.getByLabel("Slug", { exact: true }).fill(`e2e-${kind}-${token}`);
      await create.getByLabel("排序（越小越靠前）").fill("-999999");
      await saveAndReload(page, create.getByRole("button", { name: "新增条目" }));

      const record = region.locator("details").filter({ has: page.locator("summary strong", { hasText: name }) });
      await expect(record.locator("summary")).toContainText("顺序 -999999");
      await expectSorted(region);
      await record.locator("summary").click();
      await record.getByLabel("名称", { exact: true }).fill(updatedName);
      await record.getByLabel("排序（越小越靠前）").fill("999999");
      await saveAndReload(page, record.getByRole("button", { name: "保存修改" }));
      await expect(record.locator("summary")).toContainText(updatedName);
      await expect(record.locator("summary")).toContainText("顺序 999999");
      await expectSorted(region);
      await record.locator("summary").click();
      page.once("dialog", (dialog) => dialog.accept());
      await saveAndReload(page, record.getByRole("button", { name: "删除", exact: true }));
      await expect(record).toHaveCount(0);
    }
  });

  test("tool tag editing synchronizes the taxonomy and renaming back to the draft", async ({ page }, testInfo) => {
    const token = `${testInfo.project.name}-${Date.now()}`;
    const name = `标签测试-${token}`;
    const tag = `e2e-${token}`;
    const renamed = `${tag}-renamed`;
    await page.goto("/admin/tools");
    const create = page.getByRole("region", { name: "新增草稿" });
    await create.getByLabel("名称", { exact: true }).fill(name);
    await create.getByLabel("Slug", { exact: true }).fill(`e2e-tool-${token}`);
    await create.getByLabel("标签（逗号分隔）").fill(tag);
    await saveAndReload(page, create.getByRole("button", { name: "创建草稿" }));
    await expect(page.locator("summary").filter({ hasText: name })).toContainText("草稿");

    await page.goto("/admin/taxonomy");
    const record = page.getByRole("region", { name: "标签管理" }).locator("details").filter({ has: page.locator("summary strong", { hasText: tag }) });
    await record.locator("summary").click();
    await record.getByLabel("名称", { exact: true }).fill(renamed);
    await saveAndReload(page, record.getByRole("button", { name: "保存修改" }));
    await expect(record.locator("summary")).toContainText(renamed);

    await page.goto("/admin/tools");
    const tool = page.locator("details").filter({ has: page.locator("summary strong", { hasText: name }) });
    await tool.locator("summary").click();
    await expect(tool.getByLabel("标签（逗号分隔）")).toHaveValue(renamed);
    await tool.getByLabel("标签（逗号分隔）").fill(`${renamed}, ui-added`);
    await saveAndReload(page, tool.getByRole("button", { name: "保存修改" }));
    await expect(tool.locator("summary")).toBeVisible();
    await tool.locator("summary").click();
    await expect(tool.getByLabel("标签（逗号分隔）")).toHaveValue(`${renamed}, ui-added`);
  });

  test("a reader recommendation becomes a non-public draft through the review UI", async ({ page }, testInfo) => {
    const name = `Review-${testInfo.project.name}-${Date.now()}`;
    await page.goto("/submit");
    await page.getByLabel("工具名称", { exact: true }).fill(name);
    await page.getByLabel("官网地址", { exact: true }).fill("https://example.com/e2e-review");
    await page.getByLabel("说明", { exact: true }).fill("供编辑验收投稿转换流程的独立测试记录。");
    await page.getByRole("button", { name: "提交给编辑部" }).click();
    await expect(page.getByRole("heading", { name: "感谢你的贡献。" })).toBeVisible();

    await page.goto("/admin/submissions");
    const submission = page.getByRole("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
    await submission.getByLabel("审核说明").fill("已核验，仅转换为草稿，尚不发布。");
    await saveAndReload(page, submission.getByRole("button", { name: "转为工具草稿" }));
    await expect(submission.getByRole("link", { name: /已转为工具草稿/ })).toBeVisible();
    await expect(submission.getByRole("button", { name: "转为工具草稿" })).toHaveCount(0);
    await submission.getByRole("link", { name: /已转为工具草稿/ }).click();
    await expect(page.locator("summary").filter({ hasText: name })).toContainText("草稿");
    const response = await page.request.get(`/api/search?q=${encodeURIComponent(name)}`);
    expect(response.ok()).toBe(true);
    expect(await response.text()).not.toContain(name);
  });

  test("new admin forms expose labels, keyboard select focus and 360px accessible layout", async ({ page }) => {
    await page.goto("/admin/tools");
    const create = page.getByRole("region", { name: "新增草稿" });
    await create.getByLabel("定价说明", { exact: true }).focus();
    await page.keyboard.press("Tab");
    const pricing = create.getByRole("combobox", { name: /^定价类型/ });
    await expect(pricing).toBeFocused();
    expect(await pricing.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe("3px");
    expect(await pricing.evaluate((element) => getComputedStyle(element).outlineOffset)).toBe("2px");

    for (const route of ["/admin/taxonomy", "/admin/operations"]) {
      await page.goto(route);
      if (route.endsWith("taxonomy")) await page.getByRole("region", { name: "分类管理" }).locator("details").first().locator("summary").click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(results.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await expect(page.getByRole("link", { name: "下载完整 JSON 备份" })).toHaveAttribute("href", "/api/admin/backup");
    await expect(page.getByText("当前已发布 92 款工具，其中国内 12 款。2026-09-05 资料包：待导入。", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "导入 2026-09-05 核验资料" })).toBeEnabled();
    await expect(page.getByLabel("备份文件")).toBeVisible();
    await expect(page.getByLabel("恢复确认")).toBeVisible();
  });
});
