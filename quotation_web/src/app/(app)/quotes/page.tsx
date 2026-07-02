import { NewQuoteDialog } from "@/components/quotes/new-quote-dialog";
import { QuoteListShell } from "@/components/quotes/quote-list-shell";
import { createQuotationRepository } from "@/server/repositories";

export default async function QuotesPage() {
  const repository = await createQuotationRepository();
  const quotes = await repository.listQuotes();

  return (
    <main className="page-frame">
      <div className="page-head">
        <div>
          <p className="page-kicker">报价记录</p>
          <h2>管理全部报价单</h2>
        </div>
        <NewQuoteDialog />
      </div>
      <QuoteListShell quotes={quotes} />
    </main>
  );
}
