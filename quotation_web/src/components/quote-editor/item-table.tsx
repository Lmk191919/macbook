"use client";

import type { QuoteItemRecord } from "@/server/repositories/quotation-repository";

type ItemTableProps = Readonly<{
  items: readonly QuoteItemRecord[];
  onChangeItem: (itemId: string, patch: Partial<QuoteItemRecord>) => void;
}>;

export function ItemTable({ items, onChangeItem }: ItemTableProps) {
  return (
    <div className="table-shell">
      <table className="data-table editor-table">
        <thead>
          <tr>
            <th>项目</th>
            <th>工程量</th>
            <th>计价方式</th>
            <th>单价</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.name}</strong>
              </td>
              <td>
                <label className="sr-only" htmlFor={`${item.id}-quantity`}>
                  {item.name} 工程量
                </label>
                <input
                  aria-label={`${item.name} 工程量`}
                  className="input focus-ring"
                  id={`${item.id}-quantity`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.quantity}
                  onChange={(event) => onChangeItem(item.id, { quantity: Number(event.target.value) })}
                />
              </td>
              <td>
                <label className="sr-only" htmlFor={`${item.id}-pricing-mode`}>
                  {item.name} 计价方式
                </label>
                <select
                  aria-label={`${item.name} 计价方式`}
                  className="input focus-ring"
                  id={`${item.id}-pricing-mode`}
                  value={item.pricingMode}
                  onChange={(event) =>
                    onChangeItem(item.id, {
                      pricingMode: event.target.value as QuoteItemRecord["pricingMode"],
                    })
                  }
                >
                  <option value="combined">combined</option>
                  <option value="split">split</option>
                </select>
              </td>
              <td className="editor-price-cell">
                {item.pricingMode === "combined" ? (
                  <>
                    <label className="sr-only" htmlFor={`${item.id}-combined-price`}>
                      {item.name} 综合单价
                    </label>
                    <input
                      aria-label={`${item.name} 综合单价`}
                      className="input focus-ring"
                      id={`${item.id}-combined-price`}
                      type="number"
                      min={0}
                      step={1}
                      value={item.combinedUnitPrice}
                      onChange={(event) =>
                        onChangeItem(item.id, { combinedUnitPrice: Number(event.target.value) })
                      }
                    />
                  </>
                ) : (
                  <div className="split-price-grid">
                    <label className="sr-only" htmlFor={`${item.id}-labor-price`}>
                      {item.name} 人工单价
                    </label>
                    <input
                      aria-label={`${item.name} 人工单价`}
                      className="input focus-ring"
                      id={`${item.id}-labor-price`}
                      type="number"
                      min={0}
                      step={1}
                      value={item.laborUnitPrice}
                      onChange={(event) => onChangeItem(item.id, { laborUnitPrice: Number(event.target.value) })}
                    />
                    <label className="sr-only" htmlFor={`${item.id}-material-price`}>
                      {item.name} 材料单价
                    </label>
                    <input
                      aria-label={`${item.name} 材料单价`}
                      className="input focus-ring"
                      id={`${item.id}-material-price`}
                      type="number"
                      min={0}
                      step={1}
                      value={item.materialUnitPrice}
                      onChange={(event) => onChangeItem(item.id, { materialUnitPrice: Number(event.target.value) })}
                    />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
