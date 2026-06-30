export type RepositoryErrorCode = "VERSION_CONFLICT" | "NOT_FOUND";

export class QuotationRepositoryError extends Error {
  constructor(
    public readonly code: RepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "QuotationRepositoryError";
  }
}

export type QuoteStatus = "draft" | "confirmed";

export type QuoteInput = Readonly<{
  customerName: string;
  projectName: string;
  area: number;
  renovationType: string;
  customerPhone?: string;
  address?: string;
  notes?: string;
  status?: QuoteStatus;
}>;

export type QuoteUpdateInput = Readonly<{
  customerName?: string;
  projectName?: string;
  area?: number;
  renovationType?: string;
  customerPhone?: string;
  address?: string;
  notes?: string;
  status?: QuoteStatus;
}>;

export type QuoteSummary = Readonly<{
  id: string;
  quoteNo: string;
  customerName: string;
  projectName: string;
  area: number;
  renovationType: string;
  status: QuoteStatus;
  version: number;
  updatedAt: string;
  subtotal: number;
  adjustmentTotal: number;
  grandTotal: number;
}>;

export type QuoteSpaceInput = Readonly<{
  name: string;
  notes?: string;
  area?: number;
  wallArea?: number;
  sortOrder?: number;
}>;

export type QuoteSpaceUpdateInput = Readonly<{
  name?: string;
  notes?: string;
  area?: number;
  wallArea?: number;
  sortOrder?: number;
}>;

export type QuoteSpaceRecord = Readonly<{
  id: string;
  name: string;
  notes?: string;
  area?: number;
  wallArea?: number;
  sortOrder: number;
  items: QuoteItemRecord[];
}>;

export type QuoteItemInput = Readonly<{
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  pricingMode: "combined" | "split";
  combinedUnitPrice: number;
  laborUnitPrice: number;
  materialUnitPrice: number;
  notes?: string;
  sortOrder?: number;
  sourceCatalogItemId?: string;
}>;

export type QuoteItemUpdateInput = Readonly<{
  name?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  pricingMode?: "combined" | "split";
  combinedUnitPrice?: number;
  laborUnitPrice?: number;
  materialUnitPrice?: number;
  notes?: string;
  sortOrder?: number;
  sourceCatalogItemId?: string;
}>;

export type QuoteItemRecord = Readonly<{
  id: string;
  sourceCatalogItemId?: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  pricingMode: "combined" | "split";
  combinedUnitPrice: number;
  laborUnitPrice: number;
  materialUnitPrice: number;
  notes?: string;
  sortOrder: number;
}>;

export type QuoteAdjustmentInput = Readonly<{
  kind: "charge" | "discount";
  name: string;
  amount: number;
  notes?: string;
  sortOrder?: number;
}>;

export type QuoteAdjustmentUpdateInput = Readonly<{
  kind?: "charge" | "discount";
  name?: string;
  amount?: number;
  notes?: string;
  sortOrder?: number;
}>;

export type QuoteAdjustmentRecord = Readonly<{
  id: string;
  kind: "charge" | "discount";
  name: string;
  amount: number;
  notes?: string;
  sortOrder: number;
}>;

export type QuoteDraftSpaceInput = Readonly<{
  id?: string;
  name: string;
  notes?: string;
  area?: number;
  wallArea?: number;
  sortOrder: number;
  items: Array<
    Readonly<{
      id?: string;
      sourceCatalogItemId?: string;
      name: string;
      description?: string;
      unit: string;
      quantity: number;
      pricingMode: "combined" | "split";
      combinedUnitPrice: number;
      laborUnitPrice: number;
      materialUnitPrice: number;
      notes?: string;
      sortOrder: number;
    }>
  >;
}>;

export type QuoteDraftAdjustmentInput = Readonly<{
  id?: string;
  kind: "charge" | "discount";
  name: string;
  amount: number;
  notes?: string;
  sortOrder: number;
}>;

export type QuoteDocumentInput = Readonly<{
  customerName?: string;
  customerPhone?: string;
  projectName?: string;
  area?: number;
  renovationType?: string;
  address?: string;
  notes?: string;
  status?: QuoteStatus;
  spaces: QuoteDraftSpaceInput[];
  adjustments: QuoteDraftAdjustmentInput[];
}>;

export type CatalogItemInput = Readonly<{
  name: string;
  spaces: readonly string[];
  unit: string;
  pricingMode: "combined" | "split";
  combinedUnitPrice: number;
  laborUnitPrice: number;
  materialUnitPrice: number;
  description?: string;
  notes?: string;
  active?: boolean;
  sortOrder?: number;
}>;

export type CatalogItemUpdateInput = Readonly<{
  name?: string;
  spaces?: readonly string[];
  unit?: string;
  pricingMode?: "combined" | "split";
  combinedUnitPrice?: number;
  laborUnitPrice?: number;
  materialUnitPrice?: number;
  description?: string;
  notes?: string;
  active?: boolean;
  sortOrder?: number;
}>;

export type CatalogItemRecord = Readonly<{
  id: string;
  name: string;
  spaces: string[];
  unit: string;
  pricingMode: "combined" | "split";
  combinedUnitPrice: number;
  laborUnitPrice: number;
  materialUnitPrice: number;
  description?: string;
  notes?: string;
  active: boolean;
  sortOrder: number;
}>;

export type QuoteRecord = Readonly<{
  id: string;
  quoteNo: string;
  customerName: string;
  customerPhone?: string;
  projectName: string;
  area: number;
  renovationType: string;
  address?: string;
  notes?: string;
  status: QuoteStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  spaces: QuoteSpaceRecord[];
  adjustments: QuoteAdjustmentRecord[];
}>;

export type QuotationRepository = Readonly<{
  listQuotes: (query?: string) => Promise<QuoteSummary[]>;
  getQuote: (quoteId: string) => Promise<QuoteRecord | null>;
  createQuote: (input: QuoteInput) => Promise<QuoteRecord>;
  updateQuote: (quoteId: string, version: number, input: QuoteUpdateInput) => Promise<QuoteRecord>;
  saveQuoteDocument: (quoteId: string, version: number, input: QuoteDocumentInput) => Promise<QuoteRecord>;
  copyQuote: (quoteId: string) => Promise<QuoteRecord>;
  deleteQuote: (quoteId: string) => Promise<void>;
  createSpace: (quoteId: string, input: QuoteSpaceInput) => Promise<QuoteSpaceRecord>;
  updateSpace: (quoteId: string, spaceId: string, input: QuoteSpaceUpdateInput) => Promise<QuoteSpaceRecord>;
  reorderSpaces: (quoteId: string, orderedSpaceIds: readonly string[]) => Promise<QuoteRecord>;
  deleteSpace: (quoteId: string, spaceId: string) => Promise<void>;
  createItem: (quoteId: string, spaceId: string, input: QuoteItemInput) => Promise<QuoteItemRecord>;
  updateItem: (quoteId: string, spaceId: string, itemId: string, input: QuoteItemUpdateInput) => Promise<QuoteItemRecord>;
  reorderItems: (quoteId: string, spaceId: string, orderedItemIds: readonly string[]) => Promise<QuoteRecord>;
  deleteItem: (quoteId: string, spaceId: string, itemId: string) => Promise<void>;
  createAdjustment: (quoteId: string, input: QuoteAdjustmentInput) => Promise<QuoteAdjustmentRecord>;
  updateAdjustment: (quoteId: string, adjustmentId: string, input: QuoteAdjustmentUpdateInput) => Promise<QuoteAdjustmentRecord>;
  reorderAdjustments: (quoteId: string, orderedAdjustmentIds: readonly string[]) => Promise<QuoteRecord>;
  deleteAdjustment: (quoteId: string, adjustmentId: string) => Promise<void>;
  listCatalogItems: (query?: string | Readonly<{ query?: string; space?: string; activeOnly?: boolean }>) => Promise<CatalogItemRecord[]>;
  getCatalogItem: (catalogItemId: string) => Promise<CatalogItemRecord | null>;
  createCatalogItem: (input: CatalogItemInput) => Promise<CatalogItemRecord>;
  updateCatalogItem: (catalogItemId: string, input: CatalogItemUpdateInput) => Promise<CatalogItemRecord>;
  deleteCatalogItem: (catalogItemId: string) => Promise<void>;
}>;

export function createRepositoryError(code: RepositoryErrorCode, message: string): QuotationRepositoryError {
  return new QuotationRepositoryError(code, message);
}

export function notFound(message: string): QuotationRepositoryError {
  return createRepositoryError("NOT_FOUND", message);
}

export function versionConflict(message: string): QuotationRepositoryError {
  return createRepositoryError("VERSION_CONFLICT", message);
}

export function cloneRecord<T>(value: T): T {
  return structuredClone(value);
}
