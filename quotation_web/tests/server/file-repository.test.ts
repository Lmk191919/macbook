// @vitest-environment node

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FileQuotationRepository } from "@/server/repositories/file-quotation-repository";

describe("FileQuotationRepository", () => {
  let tempDir: string;
  let repoFile: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "quotation-repo-"));
    repoFile = join(tempDir, "dev-db.json");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates, persists, updates, copies, and deletes quotations", async () => {
    const repo = new FileQuotationRepository(repoFile);

    const created = await repo.createQuote({
      customerName: "王先生",
      projectName: "城南花园",
      area: 108,
      renovationType: "全屋装修",
    });

    expect((await repo.listQuotes("王先生"))[0]?.id).toBe(created.id);

    const updated = await repo.updateQuote(created.id, created.version, {
      notes: "测试",
    });

    await expect(
      repo.updateQuote(created.id, created.version, { notes: "旧版本" }),
    ).rejects.toThrow("VERSION_CONFLICT");

    const copied = await repo.copyQuote(updated.id);
    expect(copied.customerName).toContain("副本");

    await repo.deleteQuote(created.id);
    expect(await repo.getQuote(created.id)).toBeNull();

    const saved = JSON.parse(await readFile(repoFile, "utf8")) as { quotes: unknown[] };
    expect(saved.quotes).toHaveLength(1);
  });

  it("persists spaces, items, adjustments, and catalog records", async () => {
    const repo = new FileQuotationRepository(repoFile);
    const quote = await repo.createQuote({
      customerName: "李女士",
      projectName: "锦绣苑",
      area: 92,
      renovationType: "局部改造",
    });

    const space = await repo.createSpace(quote.id, {
      name: "客厅",
      sortOrder: 0,
      notes: "朝南",
    });

    const item = await repo.createItem(quote.id, space.id, {
      name: "墙面基层处理",
      unit: "m²",
      quantity: 88,
      pricingMode: "combined",
      combinedUnitPrice: 2800,
      laborUnitPrice: 0,
      materialUnitPrice: 0,
      sortOrder: 0,
    });

    const adjustment = await repo.createAdjustment(quote.id, {
      kind: "charge",
      name: "设计费",
      amount: 50000,
      sortOrder: 0,
    });

    const catalog = await repo.createCatalogItem({
      name: "瓷砖铺贴",
      spaces: ["厨房", "卫生间"],
      unit: "m²",
      pricingMode: "split",
      combinedUnitPrice: 0,
      laborUnitPrice: 4500,
      materialUnitPrice: 5000,
      active: true,
      sortOrder: 0,
    });

    expect((await repo.getQuote(quote.id))?.spaces[0]?.items[0]?.id).toBe(item.id);
    expect((await repo.getQuote(quote.id))?.adjustments[0]?.id).toBe(adjustment.id);
    expect((await repo.listCatalogItems("瓷砖"))[0]?.id).toBe(catalog.id);

    await repo.updateCatalogItem(catalog.id, {
      active: false,
    });

    await repo.deleteItem(quote.id, space.id, item.id);
    await repo.deleteSpace(quote.id, space.id);
    await repo.deleteAdjustment(quote.id, adjustment.id);
    await repo.deleteCatalogItem(catalog.id);

    expect(await repo.listQuotes("李女士")).toHaveLength(1);
  });
});
