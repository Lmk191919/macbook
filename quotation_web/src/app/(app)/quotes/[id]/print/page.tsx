import "@/app/print.css";

import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintQuotation } from "@/components/print/print-quotation";
import { createQuotationRepository } from "@/server/repositories";

export default async function QuotePrintPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const repository = await createQuotationRepository();
  const quote = await repository.getQuote(id);

  if (!quote) {
    notFound();
  }

  return (
    <main className="print-page">
      <div className="print-toolbar">
        <Link className="button button--ghost focus-ring" href={`/quotes/${id}`}>
          返回编辑
        </Link>
      </div>
      <PrintQuotation quote={quote} />
    </main>
  );
}
