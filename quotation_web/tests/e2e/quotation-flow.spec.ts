import { expect, test } from "@playwright/test";

test("renovation quotation flow covers login, editing, copying, and print view", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/login");

  await page.getByLabel("团队密码").fill("dev-team-password");
  await page.getByRole("button", { name: "进入系统" }).click();
  await expect(page).toHaveURL(/\/quotes$/);
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "新建报价" }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole("dialog", { name: "新建报价" })).toBeVisible();
  await page.getByLabel("客户姓名").fill("赵女士");
  await page.getByLabel("小区/项目").fill("静安府");
  await page.getByLabel("面积").fill("118");
  await page.getByLabel("装修类型").fill("全屋装修");
  await page.getByRole("button", { name: "创建报价" }).click();

  await expect(page.getByRole("heading", { level: 2, name: "静安府" })).toBeVisible();
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: "从项目库添加" }).click();
  await expect(page.getByRole("dialog", { name: "项目库选择" })).toBeVisible();
  await page.getByRole("checkbox", { name: "墙面基层处理" }).check();
  await page.getByRole("checkbox", { name: "乳胶漆涂刷" }).check();
  await page.getByRole("button", { name: "添加所选项目" }).click();

  await page.getByRole("button", { name: "主卧 0 项" }).click();
  await page.getByRole("button", { name: "从项目库添加" }).click();
  await expect(page.getByRole("dialog", { name: "项目库选择" })).toBeVisible();
  await page.getByRole("checkbox", { name: "门套安装" }).check();
  await page.getByRole("button", { name: "添加所选项目" }).click();

  await page.getByRole("button", { name: "客厅/餐厅 2 项" }).click();
  await page.getByLabel("墙面基层处理 工程量").fill("100");
  await page.getByLabel("墙面基层处理 综合单价").fill("3000");
  await page.getByLabel("乳胶漆涂刷 工程量").fill("90");

  await page.getByRole("button", { name: "主卧 1 项" }).click();
  await page.getByLabel("门套安装 工程量").fill("2");
  await page.getByLabel("门套安装 计价方式").selectOption("split");
  await page.getByLabel("门套安装 人工单价").fill("3500");
  await page.getByLabel("门套安装 材料单价").fill("9800");

  const summaryPanel = page.locator(".editor-summary");
  await expect(summaryPanel.getByText("总价")).toBeVisible();
  await expect(summaryPanel.locator("dd").last()).toHaveText("¥6,506.00");
  await expect(page.getByText(/保存状态：(saving|saved)/)).toBeVisible();
  await expect(page.getByText("保存状态：saved")).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await page.getByRole("button", { name: "主卧 1 项" }).click();
  await expect(page.getByLabel("门套安装 人工单价")).toHaveValue("3500");
  await expect(page.locator(".editor-summary").locator("dd").last()).toHaveText("¥6,506.00");

  await page.goto("/quotes");
  await page.getByRole("button", { name: "复制" }).first().click();
  await expect(page).toHaveURL(/\/quotes\//);
  await expect(page.getByText("当前空间：客厅/餐厅")).toBeVisible();

  const printPage = await page.context().newPage();
  await printPage.goto(`${page.url()}/print`);
  await expect(printPage.getByText("知底装修报价单")).toBeVisible();
  await printPage.setViewportSize({ width: 390, height: 844 });
  await expect(printPage.getByText("报价编号")).toBeVisible();
});
