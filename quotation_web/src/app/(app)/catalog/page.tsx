import { CatalogTable } from "@/components/catalog/catalog-table";
import { ensureCatalogSeeded } from "@/server/catalog-seed";
import { createQuotationRepository } from "@/server/repositories";

export default async function CatalogPage() {
  const repository = await createQuotationRepository();
  await ensureCatalogSeeded(repository);
  const items = await repository.listCatalogItems({ activeOnly: false });

  return (
    <main className="page-frame">
      <div className="page-head">
        <div>
          <p className="page-kicker">项目库</p>
          <h2>维护施工项目清单</h2>
        </div>
      </div>
      <CatalogTable items={items} />
    </main>
  );
}
