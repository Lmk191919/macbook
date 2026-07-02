"use client";

import { formatCents } from "@/lib/money";

type SummaryPanelProps = Readonly<{
  subtotal: number;
  adjustmentTotal: number;
  grandTotal: number;
  autosaveStatus: string;
}>;

export function SummaryPanel({ subtotal, adjustmentTotal, grandTotal, autosaveStatus }: SummaryPanelProps) {
  return (
    <aside className="editor-summary card stack">
      <div>
        <p className="page-kicker">汇总</p>
        <h3>实时报价</h3>
      </div>
      <dl className="summary-list">
        <div>
          <dt>施工小计</dt>
          <dd>{formatCents(subtotal)}</dd>
        </div>
        <div>
          <dt>调整项</dt>
          <dd>{formatCents(adjustmentTotal)}</dd>
        </div>
        <div>
          <dt>总价</dt>
          <dd>{formatCents(grandTotal)}</dd>
        </div>
      </dl>
      <p className="muted">保存状态：{autosaveStatus}</p>
    </aside>
  );
}
