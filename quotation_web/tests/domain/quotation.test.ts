import { describe, expect, it } from "vitest";

import {
  calculateItemBreakdown,
  calculateItemTotal,
  calculateQuoteTotals,
  calculateSpaceTotal,
} from "@/domain/quotation";

describe("quotation calculations", () => {
  it("calculates combined and split price items in cents", () => {
    expect(
      calculateItemTotal({
        quantity: 88,
        pricingMode: "combined",
        combinedUnitPrice: 2800,
        laborUnitPrice: 0,
        materialUnitPrice: 0,
      }),
    ).toBe(246400);

    expect(
      calculateItemTotal({
        quantity: 36,
        pricingMode: "split",
        combinedUnitPrice: 0,
        laborUnitPrice: 4500,
        materialUnitPrice: 5000,
      }),
    ).toBe(342000);
  });

  it("returns labor and material breakdowns", () => {
    expect(
      calculateItemBreakdown({
        quantity: 36,
        pricingMode: "split",
        combinedUnitPrice: 0,
        laborUnitPrice: 4500,
        materialUnitPrice: 5000,
      }),
    ).toEqual({
      laborTotal: 162000,
      materialTotal: 180000,
      total: 342000,
    });
  });

  it("adds charges and subtracts discounts", () => {
    const totals = calculateQuoteTotals(
      [{ total: 1000000, labor: 400000, material: 600000 }],
      [
        { kind: "charge", amount: 50000 },
        { kind: "discount", amount: 20000 },
      ],
    );

    expect(totals).toEqual({
      laborTotal: 400000,
      materialTotal: 600000,
      subtotal: 1000000,
      adjustmentTotal: 30000,
      grandTotal: 1030000,
    });
  });

  it("sums a space total from item breakdowns", () => {
    expect(
      calculateSpaceTotal([
        { total: 120000, labor: 50000, material: 70000 },
        { total: 30000, labor: 10000, material: 20000 },
      ]),
    ).toEqual({
      total: 150000,
      labor: 60000,
      material: 90000,
    });
  });

  it("rejects invalid quantities", () => {
    expect(() =>
      calculateItemTotal({
        quantity: -1,
        pricingMode: "combined",
        combinedUnitPrice: 2800,
        laborUnitPrice: 0,
        materialUnitPrice: 0,
      }),
    ).toThrow("Invalid quantity");

    expect(() =>
      calculateItemTotal({
        quantity: Number.NaN,
        pricingMode: "combined",
        combinedUnitPrice: 2800,
        laborUnitPrice: 0,
        materialUnitPrice: 0,
      }),
    ).toThrow("Invalid quantity");
  });
});
