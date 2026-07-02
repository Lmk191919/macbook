import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrintQuotation } from "@/components/print/print-quotation";
import type { QuoteRecord } from "@/server/repositories/quotation-repository";

function createQuote(): QuoteRecord {
  return {
    id: "quote_1",
    quoteNo: "ZD-20260630-001",
    customerName: "王先生",
    customerPhone: "13800000000",
    projectName: "城南花园",
    area: 108,
    renovationType: "全屋装修",
    address: "上海市浦东新区城南花园",
    notes: "报价含基础施工与主材安装。",
    status: "draft",
    version: 4,
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

describe("PrintQuotation", () => {
  it("renders quote details, totals, notes, and excludes editor controls", () => {
    render(<PrintQuotation quote={createQuote()} />);

    expect(screen.getByText("知底装修报价单")).toBeVisible();
    expect(screen.getByText("王先生")).toBeVisible();
    expect(screen.getByText("城南花园")).toBeVisible();
    expect(screen.getByText("客厅/餐厅")).toBeVisible();
    expect(screen.getByText("厨房")).toBeVisible();
    expect(screen.getByText("设计费")).toBeVisible();
    expect(screen.getByText("报价含基础施工与主材安装。")).toBeVisible();
    expect(screen.getByText("报价日期")).toBeVisible();
    expect(screen.getByText("总价")).toBeVisible();

    expect(screen.queryByRole("button", { name: "从项目库添加" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "删除当前空间" })).not.toBeInTheDocument();
  });
});
