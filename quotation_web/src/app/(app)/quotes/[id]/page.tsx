import { notFound } from "next/navigation";

import { QuoteEditor } from "@/components/quote-editor/quote-editor";
import { ensureCatalogSeeded } from "@/server/catalog-seed";
import { createQuotationRepository } from "@/server/repositories";

export default async function QuoteEditorPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const repository = await createQuotationRepository();
  await ensureCatalogSeeded(repository);
  const quote = await repository.getQuote(id);

  if (!quote) {
    notFound();
  }

  const catalogItems = await repository.listCatalogItems({ activeOnly: true });

  return (
    <main className="page-frame">
      <QuoteEditor
        catalogItems={catalogItems}
        initialQuote={quote}
        saveUrl={`/api/quotes/${id}`}
      />
    </main>
  );
}
