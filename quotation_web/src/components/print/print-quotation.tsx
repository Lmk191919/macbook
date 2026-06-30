import {
  calculateItemBreakdown,
  calculateQuoteTotals,
  calculateSpaceTotal,
} from "@/domain/quotation";
import { formatCents } from "@/lib/money";
import type { QuoteRecord } from "@/server/repositories/quotation-repository";

type PrintQuotationProps = Readonly<{
  quote: QuoteRecord;
}>;

export function PrintQuotation({ quote }: PrintQuotationProps) {
  const spaceTotals = quote.spaces.map((space) => ({
    ...space,
    totals: calculateSpaceTotal(
      space.items.map((item) => {
        const breakdown = calculateItemBreakdown(item);
        return {
          total: breakdown.total,
          labor: breakdown.laborTotal,
          material: breakdown.materialTotal,
        };
      }),
    ),
  }));

  const totals = calculateQuoteTotals(
    spaceTotals.map((space) => space.totals),
    quote.adjustments,
  );

  return (
    <article className="print-sheet">
      <header className="print-sheet__header">
        <div>
          <p className="page-kicker">正式报价</p>
          <h1>知底装修报价单</h1>
          <p className="muted">报价编号：{quote.quoteNo}</p>
        </div>
        <dl className="print-meta">
          <div>
            <dt>客户</dt>
            <dd>{quote.customerName}</dd>
          </div>
          <div>
            <dt>项目</dt>
            <dd>{quote.projectName}</dd>
          </div>
          <div>
            <dt>面积</dt>
            <dd>{quote.area} ㎡</dd>
          </div>
          <div>
            <dt>报价日期</dt>
            <dd>{new Date(quote.updatedAt).toLocaleDateString("zh-CN")}</dd>
          </div>
        </dl>
      </header>

      <section className="print-section">
        <h2>项目基础信息</h2>
        <div className="print-grid">
          <div>
            <strong>联系电话</strong>
            <p>{quote.customerPhone ?? "-"}</p>
          </div>
          <div>
            <strong>装修类型</strong>
            <p>{quote.renovationType}</p>
          </div>
          <div className="print-grid__wide">
            <strong>项目地址</strong>
            <p>{quote.address ?? "-"}</p>
          </div>
        </div>
      </section>

      {spaceTotals.map((space) => (
        <section className="print-section print-space-group" key={space.id}>
          <div className="print-space-head">
            <h2>{space.name}</h2>
            <span>{formatCents(space.totals.total)}</span>
          </div>
          <table className="data-table print-table">
            <thead>
              <tr>
                <th>项目</th>
                <th>工程量</th>
                <th>单价</th>
                <th>金额</th>
              </tr>
            </thead>
            <tbody>
              {space.items.map((item) => {
                const breakdown = calculateItemBreakdown(item);
                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      {item.quantity} {item.unit}
                    </td>
                    <td>
                      {item.pricingMode === "combined"
                        ? formatCents(item.combinedUnitPrice)
                        : `${formatCents(item.laborUnitPrice)} + ${formatCents(item.materialUnitPrice)}`}
                    </td>
                    <td>{formatCents(breakdown.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      <section className="print-section">
        <h2>费用汇总</h2>
        <div className="print-summary">
          <div>
            <span>施工小计</span>
            <strong>{formatCents(totals.subtotal)}</strong>
          </div>
          {quote.adjustments.map((adjustment) => (
            <div key={adjustment.id}>
              <span>{adjustment.name}</span>
              <strong>
                {adjustment.kind === "discount" ? "-" : "+"}
                {formatCents(adjustment.amount)}
              </strong>
            </div>
          ))}
          <div className="print-summary__grand">
            <span>总价</span>
            <strong>{formatCents(totals.grandTotal)}</strong>
          </div>
        </div>
      </section>

      <section className="print-section">
        <h2>备注</h2>
        <p>{quote.notes ?? "-"}</p>
      </section>
    </article>
  );
}
