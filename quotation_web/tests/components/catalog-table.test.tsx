import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CatalogTable } from "@/components/catalog/catalog-table";

describe("CatalogTable", () => {
  it("filters items by space and shows disabled state", async () => {
    const user = userEvent.setup();

    render(
      <CatalogTable
        items={[
          {
            id: "item-1",
            name: "瓷砖铺贴",
            spaces: ["厨房", "卫生间"],
            unit: "m²",
            pricingMode: "split",
            combinedUnitPrice: 0,
            laborUnitPrice: 4500,
            materialUnitPrice: 5000,
            active: true,
            sortOrder: 0,
          },
          {
            id: "item-2",
            name: "乳胶漆涂刷",
            spaces: ["客厅/餐厅", "主卧"],
            unit: "m²",
            pricingMode: "combined",
            combinedUnitPrice: 3600,
            laborUnitPrice: 0,
            materialUnitPrice: 0,
            active: false,
            sortOrder: 1,
          },
        ]}
      />,
    );

    expect(screen.getByText("瓷砖铺贴")).toBeVisible();
    expect(screen.getByText("已停用")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("按空间筛选"), "厨房");
    expect(screen.getByText("瓷砖铺贴")).toBeVisible();
    expect(screen.queryByText("乳胶漆涂刷")).not.toBeInTheDocument();
  });
});
