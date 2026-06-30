"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { QuoteList } from "@/components/quotes/quote-list";
import type { QuoteSummary } from "@/server/repositories/quotation-repository";

type QuoteListShellProps = Readonly<{
  quotes: readonly QuoteSummary[];
}>;

export function QuoteListShell({ quotes }: QuoteListShellProps) {
  const router = useRouter();
  const [busyQuoteId, setBusyQuoteId] = useState<string | null>(null);

  async function handleDeleteQuote(quoteId: string) {
    setBusyQuoteId(quoteId);

    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("DELETE_FAILED");
      }

      router.refresh();
    } finally {
      setBusyQuoteId(null);
    }
  }

  async function handleCopyQuote(quoteId: string) {
    setBusyQuoteId(quoteId);

    try {
      const response = await fetch(`/api/quotes/${quoteId}/copy`, {
        method: "POST",
      });

      const payload = (await response.json()) as
        | { data: { id: string } }
        | { error: { message: string } };

      if (!response.ok) {
        throw new Error("COPY_FAILED");
      }

      if (!("data" in payload)) {
        throw new Error("COPY_FAILED");
      }

      router.push(`/quotes/${payload.data.id}`);
      router.refresh();
    } finally {
      setBusyQuoteId(null);
    }
  }

  return (
    <QuoteList
      disabledQuoteId={busyQuoteId}
      onCopyQuote={handleCopyQuote}
      onDeleteQuote={handleDeleteQuote}
      quotes={quotes}
    />
  );
}
