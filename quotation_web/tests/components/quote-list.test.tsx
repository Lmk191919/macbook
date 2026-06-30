import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuoteList } from "@/components/quotes/quote-list";

describe("QuoteList", () => {
  it("filters quotes by keyword and requires delete confirmation", async () => {
    const onDeleteQuote = vi.fn();
    const user = userEvent.setup();

    render(
      <QuoteList
        quotes={[
          {
            id: "quote-1",
            quoteNo: "ZD-20260630-001",
            customerName: "王先生",
            projectName: "城南花园",
            area: 108,
            renovationType: "全屋装修",
            status: "draft",
            version: 1,
            updatedAt: "2026-06-30T08:00:00.000Z",
            subtotal: 1000000,
            adjustmentTotal: 30000,
            grandTotal: 1030000,
          },
          {
            id: "quote-2",
            quoteNo: "ZD-20260630-002",
            customerName: "李女士",
            projectName: "锦绣苑",
            area: 92,
            renovationType: "局部改造",
            status: "confirmed",
            version: 2,
            updatedAt: "2026-06-30T09:00:00.000Z",
            subtotal: 800000,
            adjustmentTotal: 0,
            grandTotal: 800000,
          },
        ]}
        onDeleteQuote={onDeleteQuote}
      />,
    );

    expect(screen.getByText("王先生")).toBeVisible();
    expect(screen.getByText("李女士")).toBeVisible();

    await user.type(screen.getByRole("searchbox", { name: "搜索报价" }), "王先生");
    expect(screen.getByText("王先生")).toBeVisible();
    expect(screen.queryByText("李女士")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "删除" })[0]);
    expect(onDeleteQuote).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog", { name: "删除报价确认" });
    expect(within(dialog).getByRole("button", { name: "确认删除" })).toBeVisible();

    await user.click(within(dialog).getByRole("button", { name: "确认删除" }));
    expect(onDeleteQuote).toHaveBeenCalledWith("quote-1");
  });
});
