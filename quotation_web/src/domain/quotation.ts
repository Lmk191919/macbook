export type PricingMode = "combined" | "split";

export type QuoteItem = Readonly<{
  id?: string;
  name?: string;
  quantity: number;
  pricingMode: PricingMode;
  combinedUnitPrice: number;
  laborUnitPrice: number;
  materialUnitPrice: number;
}>;

export type QuoteItemBreakdown = Readonly<{
  total: number;
  laborTotal: number;
  materialTotal: number;
}>;

export type QuoteSpaceContribution = Readonly<{
  total: number;
  labor: number;
  material: number;
}>;

export type QuoteSpace = Readonly<{
  id?: string;
  name?: string;
  items: readonly QuoteItem[];
}>;

export type QuoteSpaceTotal = Readonly<{
  total: number;
  labor: number;
  material: number;
}>;

export type QuoteAdjustment = Readonly<{
  kind: "charge" | "discount";
  amount: number;
}>;

export type QuoteTotals = Readonly<{
  subtotal: number;
  laborTotal: number;
  materialTotal: number;
  adjustmentTotal: number;
  grandTotal: number;
}>;

export type Quote = Readonly<{
  id?: string;
  spaces: readonly QuoteSpace[];
  adjustments: readonly QuoteAdjustment[];
}>;

function assertValidQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("Invalid quantity");
  }
}

function roundMoney(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice);
}

export function calculateItemBreakdown(item: QuoteItem): QuoteItemBreakdown {
  assertValidQuantity(item.quantity);

  if (item.pricingMode === "combined") {
    const total = roundMoney(item.quantity, item.combinedUnitPrice);
    return { total, laborTotal: 0, materialTotal: 0 };
  }

  const laborTotal = roundMoney(item.quantity, item.laborUnitPrice);
  const materialTotal = roundMoney(item.quantity, item.materialUnitPrice);

  return {
    total: laborTotal + materialTotal,
    laborTotal,
    materialTotal,
  };
}

export function calculateItemTotal(item: QuoteItem): number {
  return calculateItemBreakdown(item).total;
}

export function calculateSpaceTotal(items: readonly QuoteSpaceContribution[]): QuoteSpaceTotal {
  return items.reduce<QuoteSpaceTotal>(
    (totals, item) => ({
      total: totals.total + item.total,
      labor: totals.labor + item.labor,
      material: totals.material + item.material,
    }),
    { total: 0, labor: 0, material: 0 },
  );
}

export function calculateQuoteTotals(
  spaces: readonly QuoteSpaceTotal[],
  adjustments: readonly QuoteAdjustment[],
): QuoteTotals {
  const spaceTotals = spaces.reduce<QuoteTotals>(
    (totals, space) => ({
      subtotal: totals.subtotal + space.total,
      laborTotal: totals.laborTotal + space.labor,
      materialTotal: totals.materialTotal + space.material,
      adjustmentTotal: totals.adjustmentTotal,
      grandTotal: totals.grandTotal,
    }),
    {
      subtotal: 0,
      laborTotal: 0,
      materialTotal: 0,
      adjustmentTotal: 0,
      grandTotal: 0,
    },
  );

  const adjustmentTotal = adjustments.reduce((total, adjustment) => {
    if (adjustment.kind === "charge") {
      return total + adjustment.amount;
    }

    return total - adjustment.amount;
  }, 0);

  return {
    subtotal: spaceTotals.subtotal,
    laborTotal: spaceTotals.laborTotal,
    materialTotal: spaceTotals.materialTotal,
    adjustmentTotal,
    grandTotal: spaceTotals.subtotal + adjustmentTotal,
  };
}
