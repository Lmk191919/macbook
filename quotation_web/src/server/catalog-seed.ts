import { DEFAULT_CATALOG_ITEMS, DEFAULT_SPACE_NAMES } from "@/domain/catalog";
import type { QuotationRepository } from "@/server/repositories/quotation-repository";

export { DEFAULT_SPACE_NAMES };

export async function ensureCatalogSeeded(repository: QuotationRepository): Promise<void> {
  const existing = await repository.listCatalogItems({ activeOnly: false });
  if (existing.length > 0) {
    return;
  }

  for (const item of DEFAULT_CATALOG_ITEMS) {
    await repository.createCatalogItem({
      name: item.name,
      spaces: item.spaces,
      unit: item.unit,
      pricingMode: item.pricingMode,
      combinedUnitPrice: item.combinedUnitPrice,
      laborUnitPrice: item.laborUnitPrice,
      materialUnitPrice: item.materialUnitPrice,
      description: item.description,
      notes: item.notes,
      active: item.active,
      sortOrder: item.sortOrder,
    });
  }
}
