"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatCents } from "@/lib/money";
import type { QuoteSummary } from "@/server/repositories/quotation-repository";

type QuoteListProps = Readonly<{
  quotes: readonly QuoteSummary[];
  onDeleteQuote?: (quoteId: string) => void | Promise<void>;
}>;

function matchesQuery(quote: QuoteSummary, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [quote.quoteNo, quote.customerName, quote.projectName, quote.renovationType]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function QuoteList({ quotes, onDeleteQuote }: QuoteListProps) {
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<QuoteSummary | null>(null);

  const filteredQuotes = useMemo(
    () => quotes.filter((quote) => matchesQuery(quote, query)),
    [query, quotes],
  );

  async function confirmDelete() {
    if (!pendingDelete || !onDeleteQuote) {
      setPendingDelete(null);
      return;
    }

    await onDeleteQuote(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <section className="card stack">
      <div className="toolbar">
        <label className="field field--search" htmlFor="quote-search">
          <span>搜索报价</span>
          <input
            className="input focus-ring"
            id="quote-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="编号、客户、项目、装修类型"
            type="search"
          />
        </label>
      </div>

      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>报价编号</th>
              <th>客户</th>
              <th>项目</th>
              <th>面积</th>
              <th>总额</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.map((quote) => (
              <tr key={quote.id}>
                <td>
                  <Link className="link focus-ring" href={`/quotes/${quote.id}`}>
                    {quote.quoteNo}
                  </Link>
                </td>
                <td>{quote.customerName}</td>
                <td>{quote.projectName}</td>
                <td>{quote.area} ㎡</td>
                <td>{formatCents(quote.grandTotal)}</td>
                <td>
                  <span className={`badge ${quote.status === "confirmed" ? "badge--success" : ""}`}>
                    {quote.status === "confirmed" ? "已确认" : "草稿"}
                  </span>
                </td>
                <td>{new Date(quote.updatedAt).toLocaleString("zh-CN")}</td>
                <td>
                  <button
                    className="text-button focus-ring"
                    onClick={() => setPendingDelete(quote)}
                    type="button"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {filteredQuotes.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-state">
                  没有找到匹配的报价。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {pendingDelete ? (
        <div aria-label="删除报价确认" className="dialog-backdrop" role="dialog">
          <div className="dialog-card">
            <h2>确认删除</h2>
            <p>
              删除报价 <strong>{pendingDelete.quoteNo}</strong> 后无法恢复。
            </p>
            <div className="dialog-actions">
              <button className="button button--ghost focus-ring" onClick={() => setPendingDelete(null)} type="button">
                取消
              </button>
              <button className="button button--danger focus-ring" onClick={confirmDelete} type="button">
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
