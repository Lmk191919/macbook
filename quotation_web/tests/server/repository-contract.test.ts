// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FileQuotationRepository } from "@/server/repositories/file-quotation-repository";
import type { QuotationRepository } from "@/server/repositories/quotation-repository";

type RepositoryFactory = () => Promise<QuotationRepository>;

async function runRepositoryContract(factory: RepositoryFactory) {
  const repo = await factory();

  const created = await repo.createQuote({
    customerName: "王先生",
    projectName: "城南花园",
    area: 108,
    renovationType: "全屋装修",
  });

  expect((await repo.listQuotes("王先生"))[0]?.id).toBe(created.id);

  const saved = await repo.saveQuoteDocument(created.id, created.version, {
    customerName: "王先生",
    projectName: "城南花园",
    area: 108,
    renovationType: "全屋装修",
    spaces: [
      {
        name: "客厅",
        sortOrder: 0,
        items: [
          {
            name: "乳胶漆",
            unit: "m²",
            quantity: 88,
            pricingMode: "combined",
            combinedUnitPrice: 2800,
            laborUnitPrice: 0,
            materialUnitPrice: 0,
            sortOrder: 0,
          },
        ],
      },
      {
        name: "主卧",
        sortOrder: 1,
        items: [
          {
            name: "木地板",
            unit: "m²",
            quantity: 32,
            pricingMode: "split",
            combinedUnitPrice: 0,
            laborUnitPrice: 3200,
            materialUnitPrice: 8600,
            sortOrder: 0,
          },
        ],
      },
    ],
    adjustments: [
      {
        kind: "charge",
        name: "设计费",
        amount: 50000,
        sortOrder: 0,
      },
    ],
  });

  expect(saved.spaces).toHaveLength(2);
  expect(saved.adjustments[0]?.name).toBe("设计费");

  await expect(
    repo.updateQuote(created.id, created.version, {
      notes: "旧版本更新",
    }),
  ).rejects.toThrow("VERSION_CONFLICT");

  const copied = await repo.copyQuote(saved.id);
  expect(copied.customerName).toContain("副本");
  expect(copied.spaces).toHaveLength(2);
  expect(copied.spaces[0]?.items[0]?.name).toBe("乳胶漆");

  await repo.deleteQuote(created.id);
  expect(await repo.getQuote(created.id)).toBeNull();
}

describe("repository contract", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it("passes for the file repository", async () => {
    await runRepositoryContract(async () => {
      const tempDir = await mkdtemp(join(tmpdir(), "quotation-contract-file-"));
      tempDirs.push(tempDir);
      return new FileQuotationRepository(join(tempDir, "dev-db.json"));
    });
  });

  const hasSupabaseCreds = Boolean(
    process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_SERVICE_ROLE_KEY,
  );

  it.skipIf(!hasSupabaseCreds)("passes for the Supabase repository", async () => {
    const { SupabaseQuotationRepository } = await import("@/server/repositories/supabase-quotation-repository");

    await runRepositoryContract(async () => new SupabaseQuotationRepository({
      url: process.env.TEST_SUPABASE_URL,
      serviceRoleKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY,
      schema: "public",
    }));
  });
});
