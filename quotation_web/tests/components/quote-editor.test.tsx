import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuoteEditor } from "@/components/quote-editor/quote-editor";
import type { CatalogItemRecord, QuoteRecord } from "@/server/repositories/quotation-repository";

function createQuote(): QuoteRecord {
  return {
    id: "quote_1",
    quoteNo: "ZD-20260630-001",
    customerName: "王先生",
    customerPhone: "13800000000",
    projectName: "城南花园",
    area: 108,
    renovationType: "全屋装修",
    address: "上海",
    notes: "",
    status: "draft",
    version: 3,
    createdAt: "2026-06-30T08:00:00.000Z",
    updatedAt: "2026-06-30T08:00:00.000Z",
    spaces: [
      {
        id: "space_1",
        name: "客厅/餐厅",
        sortOrder: 0,
        items: [
          {
            id: "item_1",
            name: "墙面基层处理",
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
        id: "space_2",
        name: "厨房",
        sortOrder: 1,
        items: [
          {
            id: "item_2",
            name: "厨房防水",
            unit: "m²",
            quantity: 12,
            pricingMode: "split",
            combinedUnitPrice: 0,
            laborUnitPrice: 4500,
            materialUnitPrice: 5000,
            sortOrder: 0,
          },
        ],
      },
    ],
    adjustments: [
      {
        id: "adj_1",
        kind: "charge",
        name: "设计费",
        amount: 50000,
        sortOrder: 0,
      },
    ],
  };
}

function createCatalogItems(): CatalogItemRecord[] {
  return [
    {
      id: "catalog_1",
      name: "瓷砖铺贴",
      spaces: ["厨房"],
      unit: "m²",
      pricingMode: "split",
      combinedUnitPrice: 0,
      laborUnitPrice: 4500,
      materialUnitPrice: 5000,
      active: true,
      sortOrder: 0,
    },
    {
      id: "catalog_2",
      name: "吊顶安装",
      spaces: ["厨房", "客厅/餐厅"],
      unit: "m²",
      pricingMode: "combined",
      combinedUnitPrice: 6800,
      laborUnitPrice: 0,
      materialUnitPrice: 0,
      active: true,
      sortOrder: 1,
    },
  ];
}

describe("QuoteEditor", () => {
  it("switches spaces, adds catalog items, recalculates totals, reveals split inputs, and confirms space deletion", async () => {
    const user = userEvent.setup();
    render(
      <QuoteEditor
        catalogItems={createCatalogItems()}
        initialQuote={createQuote()}
        onSave={vi.fn().mockResolvedValue({ version: 4 })}
      />,
    );

    expect(screen.getByText("墙面基层处理")).toBeVisible();
    expect(screen.queryByText("厨房防水")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^厨房/ }));
    expect(screen.getByText("厨房防水")).toBeVisible();
    expect(screen.queryByText("墙面基层处理")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "从项目库添加" }));
    const picker = screen.getByRole("dialog", { name: "项目库选择" });
    await user.click(within(picker).getByLabelText("瓷砖铺贴"));
    await user.click(within(picker).getByLabelText("吊顶安装"));
    await user.click(within(picker).getByRole("button", { name: "添加所选项目" }));

    expect(screen.getByText("瓷砖铺贴")).toBeVisible();
    expect(screen.getByText("吊顶安装")).toBeVisible();

    const quantityInput = screen.getByLabelText("厨房防水 工程量");
    await user.clear(quantityInput);
    await user.type(quantityInput, "20");
    expect(screen.getByText("当前空间小计：¥2,063.00")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("吊顶安装 计价方式"), "split");
    expect(screen.getByLabelText("吊顶安装 人工单价")).toBeVisible();
    expect(screen.getByLabelText("吊顶安装 材料单价")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "删除当前空间" }));
    const dialog = screen.getByRole("dialog", { name: "删除空间确认" });
    await user.click(within(dialog).getByRole("button", { name: "确认删除" }));
    expect(screen.queryByRole("button", { name: /^厨房/ })).not.toBeInTheDocument();
  });
});
