"use client";

import type { QuoteItemRecord } from "@/server/repositories/quotation-repository";

type ItemCardProps = Readonly<{
  item: QuoteItemRecord;
}>;

export function ItemCard({ item }: ItemCardProps) {
  return (
    <article className="editor-item-card">
      <h4>{item.name}</h4>
      <p className="muted">
        {item.quantity} {item.unit}
      </p>
    </article>
  );
}
