import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  calculateItemBreakdown,
  calculateQuoteTotals,
  calculateSpaceTotal,
} from "@/domain/quotation";
import {
  cloneRecord,
  notFound,
  type CatalogItemInput,
  type CatalogItemRecord,
  type CatalogItemUpdateInput,
  type QuoteAdjustmentInput,
  type QuoteAdjustmentRecord,
  type QuoteAdjustmentUpdateInput,
  type QuoteDocumentInput,
  type QuoteInput,
  type QuoteItemInput,
  type QuoteItemRecord,
  type QuoteItemUpdateInput,
  type QuoteRecord,
  type QuoteSpaceInput,
  type QuoteSpaceRecord,
  type QuoteSpaceUpdateInput,
  type QuoteStatus,
  type QuoteSummary,
  type QuoteUpdateInput,
  type QuotationRepository,
  versionConflict,
} from "@/server/repositories/quotation-repository";

type RepositoryState = Readonly<{
  counters: {
    quote: number;
    space: number;
    item: number;
    adjustment: number;
    catalog: number;
  };
  quotes: QuoteRecord[];
  catalogItems: CatalogItemRecord[];
}>;

const DEFAULT_STATE: RepositoryState = {
  counters: {
    quote: 1,
    space: 1,
    item: 1,
    adjustment: 1,
    catalog: 1,
  },
  quotes: [],
  catalogItems: [],
};

function nowIso(): string {
  return new Date().toISOString();
}

function quoteNoFor(date: Date, sequence: number): string {
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `ZD-${stamp}-${String(sequence).padStart(3, "0")}`;
}

function ensureFiniteNumber(value: number, message: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(message);
  }
}

function ensurePositiveMoney(value: number): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error("Invalid money value");
  }
}

function normalizeText(value: string): string {
  return value.trim();
}

function matchesQuery(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}

function updateOrdering<T extends { id: string; sortOrder: number }>(
  items: T[],
  orderedIds: readonly string[],
): T[] {
  const idSet = new Set(items.map((item) => item.id));

  if (orderedIds.length !== items.length || orderedIds.some((id) => !idSet.has(id))) {
    throw notFound("ORDER_TARGET_NOT_FOUND");
  }

  const positionById = new Map(orderedIds.map((id, index) => [id, index]));
  return items
    .map((item) => ({
      ...item,
      sortOrder: positionById.get(item.id) ?? item.sortOrder,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function definedPatch<T extends Record<string, unknown>>(patch: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function cloneState(state: RepositoryState): RepositoryState {
  return cloneRecord(state);
}

export class FileQuotationRepository implements QuotationRepository {
  constructor(private readonly filePath = join(process.cwd(), "data", "dev-db.json")) {}

  async listQuotes(query = ""): Promise<QuoteSummary[]> {
    const state = await this.readState();
    const normalizedQuery = normalizeText(query);

    return state.quotes
      .filter((quote) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          matchesQuery(quote.customerName, normalizedQuery) ||
          matchesQuery(quote.projectName, normalizedQuery) ||
          matchesQuery(quote.quoteNo, normalizedQuery) ||
          matchesQuery(quote.address ?? "", normalizedQuery)
        );
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((quote) => {
        const totals = calculateQuoteTotals(
          quote.spaces.map((space) =>
            calculateSpaceTotal(
              space.items.map((item) => {
                const breakdown = calculateItemBreakdown(item);
                return {
                  total: breakdown.total,
                  labor: breakdown.laborTotal,
                  material: breakdown.materialTotal,
                };
              }),
            ),
          ),
          quote.adjustments,
        );

        return {
          id: quote.id,
          quoteNo: quote.quoteNo,
          customerName: quote.customerName,
          projectName: quote.projectName,
          area: quote.area,
          renovationType: quote.renovationType,
          status: quote.status,
          version: quote.version,
          updatedAt: quote.updatedAt,
          subtotal: totals.subtotal,
          adjustmentTotal: totals.adjustmentTotal,
          grandTotal: totals.grandTotal,
        };
      });
  }

  async getQuote(quoteId: string): Promise<QuoteRecord | null> {
    const state = await this.readState();
    const quote = state.quotes.find((entry) => entry.id === quoteId);
    return quote ? cloneRecord(quote) : null;
  }

  async createQuote(input: QuoteInput): Promise<QuoteRecord> {
    return this.mutateState((state) => {
      const timestamp = nowIso();
      const quote = this.createQuoteRecord(state, input, timestamp);
      state.quotes.push(quote);
      return cloneRecord(quote);
    });
  }

  async updateQuote(quoteId: string, version: number, input: QuoteUpdateInput): Promise<QuoteRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      if (quote.version !== version) {
        throw versionConflict("VERSION_CONFLICT");
      }

      const updatedAt = nowIso();
      Object.assign(quote, definedPatch(this.normalizeQuotePatch(input)));
      quote.version += 1;
      quote.updatedAt = updatedAt;

      this.validateQuote(quote);

      return cloneRecord(quote);
    });
  }

  async saveQuoteDocument(quoteId: string, version: number, input: QuoteDocumentInput): Promise<QuoteRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      if (quote.version !== version) {
        throw versionConflict("VERSION_CONFLICT");
      }

      Object.assign(
        quote,
        definedPatch({
          customerName: input.customerName?.trim(),
          customerPhone: input.customerPhone?.trim(),
          projectName: input.projectName?.trim(),
          area: input.area,
          renovationType: input.renovationType?.trim(),
          address: input.address?.trim(),
          notes: input.notes?.trim(),
          status: input.status,
        }),
      );

      quote.spaces = input.spaces
        .map((space, spaceIndex) => {
          const nextSpace: QuoteSpaceRecord = {
            id: this.resolvePersistentId(state, "space", space.id),
            name: normalizeText(space.name),
            notes: space.notes?.trim() || undefined,
            area: space.area,
            wallArea: space.wallArea,
            sortOrder: space.sortOrder ?? spaceIndex,
            items: space.items.map((item, itemIndex) => {
              const nextItem: QuoteItemRecord = {
                id: this.resolvePersistentId(state, "item", item.id),
                sourceCatalogItemId: item.sourceCatalogItemId,
                name: normalizeText(item.name),
                description: item.description?.trim() || undefined,
                unit: normalizeText(item.unit),
                quantity: item.quantity,
                pricingMode: item.pricingMode,
                combinedUnitPrice: item.combinedUnitPrice,
                laborUnitPrice: item.laborUnitPrice,
                materialUnitPrice: item.materialUnitPrice,
                notes: item.notes?.trim() || undefined,
                sortOrder: item.sortOrder ?? itemIndex,
              };
              this.validateItem(nextItem);
              return nextItem;
            }),
          };

          return nextSpace;
        })
        .sort((left, right) => left.sortOrder - right.sortOrder);

      quote.adjustments = input.adjustments
        .map((adjustment, index) => {
          const nextAdjustment: QuoteAdjustmentRecord = {
            id: this.resolvePersistentId(state, "adjustment", adjustment.id),
            kind: adjustment.kind,
            name: normalizeText(adjustment.name),
            amount: adjustment.amount,
            notes: adjustment.notes?.trim() || undefined,
            sortOrder: adjustment.sortOrder ?? index,
          };
          this.validateAdjustment(nextAdjustment);
          return nextAdjustment;
        })
        .sort((left, right) => left.sortOrder - right.sortOrder);

      this.touchQuote(quote);
      this.validateQuote(quote);
      return cloneRecord(quote);
    });
  }

  async copyQuote(quoteId: string): Promise<QuoteRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      const timestamp = nowIso();
      const copied = cloneRecord(quote);

      copied.id = this.nextId(state, "quote");
      copied.quoteNo = quoteNoFor(new Date(timestamp), state.counters.quote - 1);
      copied.customerName = `${quote.customerName}副本`;
      copied.createdAt = timestamp;
      copied.updatedAt = timestamp;
      copied.version = 1;
      copied.spaces = copied.spaces.map((space) => ({
        ...space,
        id: this.nextId(state, "space"),
        items: space.items.map((item) => ({
          ...item,
          id: this.nextId(state, "item"),
        })),
      }));
      copied.adjustments = copied.adjustments.map((adjustment) => ({
        ...adjustment,
        id: this.nextId(state, "adjustment"),
      }));

      state.quotes.push(copied);
      return cloneRecord(copied);
    });
  }

  async deleteQuote(quoteId: string): Promise<void> {
    await this.mutateState((state) => {
      const index = state.quotes.findIndex((quote) => quote.id === quoteId);
      if (index < 0) {
        throw notFound("NOT_FOUND");
      }

      state.quotes.splice(index, 1);
    });
  }

  async createSpace(quoteId: string, input: QuoteSpaceInput): Promise<QuoteSpaceRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      const space: QuoteSpaceRecord = {
        id: this.nextId(state, "space"),
        name: normalizeText(input.name),
        notes: input.notes?.trim() || undefined,
        area: input.area,
        wallArea: input.wallArea,
        sortOrder: input.sortOrder ?? quote.spaces.length,
        items: [],
      };

      quote.spaces.push(space);
      this.touchQuote(quote);
      return cloneRecord(space);
    });
  }

  async updateSpace(
    quoteId: string,
    spaceId: string,
    input: QuoteSpaceUpdateInput,
  ): Promise<QuoteSpaceRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      const space = this.requireSpace(quote, spaceId);

      Object.assign(space, definedPatch(this.normalizeSpacePatch(input)));

      this.touchQuote(quote);
      return cloneRecord(space);
    });
  }

  async reorderSpaces(quoteId: string, orderedSpaceIds: readonly string[]): Promise<QuoteRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      quote.spaces = updateOrdering(quote.spaces, orderedSpaceIds);
      this.touchQuote(quote);
      return cloneRecord(quote);
    });
  }

  async deleteSpace(quoteId: string, spaceId: string): Promise<void> {
    await this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      const index = quote.spaces.findIndex((space) => space.id === spaceId);
      if (index < 0) {
        throw notFound("NOT_FOUND");
      }

      quote.spaces.splice(index, 1);
      this.touchQuote(quote);
    });
  }

  async createItem(quoteId: string, spaceId: string, input: QuoteItemInput): Promise<QuoteItemRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      const space = this.requireSpace(quote, spaceId);
      const item: QuoteItemRecord = {
        id: this.nextId(state, "item"),
        sourceCatalogItemId: input.sourceCatalogItemId,
        name: normalizeText(input.name),
        description: input.description?.trim() || undefined,
        unit: normalizeText(input.unit),
        quantity: input.quantity,
        pricingMode: input.pricingMode,
        combinedUnitPrice: input.combinedUnitPrice,
        laborUnitPrice: input.laborUnitPrice,
        materialUnitPrice: input.materialUnitPrice,
        notes: input.notes?.trim() || undefined,
        sortOrder: input.sortOrder ?? space.items.length,
      };

      this.validateItem(item);
      space.items.push(item);
      this.touchQuote(quote);
      return cloneRecord(item);
    });
  }

  async updateItem(
    quoteId: string,
    spaceId: string,
    itemId: string,
    input: QuoteItemUpdateInput,
  ): Promise<QuoteItemRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      const space = this.requireSpace(quote, spaceId);
      const item = this.requireItem(space, itemId);

      Object.assign(item, definedPatch(this.normalizeItemPatch(input)));

      this.validateItem(item);
      this.touchQuote(quote);
      return cloneRecord(item);
    });
  }

  async reorderItems(quoteId: string, spaceId: string, orderedItemIds: readonly string[]): Promise<QuoteRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      const space = this.requireSpace(quote, spaceId);
      space.items = updateOrdering(space.items, orderedItemIds);
      this.touchQuote(quote);
      return cloneRecord(quote);
    });
  }

  async deleteItem(quoteId: string, spaceId: string, itemId: string): Promise<void> {
    await this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      const space = this.requireSpace(quote, spaceId);
      const index = space.items.findIndex((item) => item.id === itemId);
      if (index < 0) {
        throw notFound("NOT_FOUND");
      }

      space.items.splice(index, 1);
      this.touchQuote(quote);
    });
  }

  async createAdjustment(quoteId: string, input: QuoteAdjustmentInput): Promise<QuoteAdjustmentRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      const adjustment: QuoteAdjustmentRecord = {
        id: this.nextId(state, "adjustment"),
        kind: input.kind,
        name: normalizeText(input.name),
        amount: input.amount,
        notes: input.notes?.trim() || undefined,
        sortOrder: input.sortOrder ?? quote.adjustments.length,
      };

      this.validateAdjustment(adjustment);
      quote.adjustments.push(adjustment);
      this.touchQuote(quote);
      return cloneRecord(adjustment);
    });
  }

  async updateAdjustment(
    quoteId: string,
    adjustmentId: string,
    input: QuoteAdjustmentUpdateInput,
  ): Promise<QuoteAdjustmentRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      const adjustment = this.requireAdjustment(quote, adjustmentId);

      Object.assign(adjustment, definedPatch(this.normalizeAdjustmentPatch(input)));

      this.validateAdjustment(adjustment);
      this.touchQuote(quote);
      return cloneRecord(adjustment);
    });
  }

  async reorderAdjustments(quoteId: string, orderedAdjustmentIds: readonly string[]): Promise<QuoteRecord> {
    return this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      quote.adjustments = updateOrdering(quote.adjustments, orderedAdjustmentIds);
      this.touchQuote(quote);
      return cloneRecord(quote);
    });
  }

  async deleteAdjustment(quoteId: string, adjustmentId: string): Promise<void> {
    await this.mutateState((state) => {
      const quote = this.requireQuote(state, quoteId);
      const index = quote.adjustments.findIndex((adjustment) => adjustment.id === adjustmentId);
      if (index < 0) {
        throw notFound("NOT_FOUND");
      }

      quote.adjustments.splice(index, 1);
      this.touchQuote(quote);
    });
  }

  async listCatalogItems(
    query?: string | Readonly<{ query?: string; space?: string; activeOnly?: boolean }>,
  ): Promise<CatalogItemRecord[]> {
    const state = await this.readState();
    const filter = typeof query === "string" ? { query } : query ?? {};
    const normalizedQuery = normalizeText(filter.query ?? "");

    return state.catalogItems
      .filter((item) => {
        if (filter.activeOnly && !item.active) {
          return false;
        }

        if (filter.space && !item.spaces.some((space) => space === filter.space)) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return (
          matchesQuery(item.name, normalizedQuery) ||
          matchesQuery(item.description ?? "", normalizedQuery) ||
          matchesQuery(item.unit, normalizedQuery) ||
          item.spaces.some((space) => matchesQuery(space, normalizedQuery))
        );
      })
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item) => cloneRecord(item));
  }

  async getCatalogItem(catalogItemId: string): Promise<CatalogItemRecord | null> {
    const state = await this.readState();
    const item = state.catalogItems.find((entry) => entry.id === catalogItemId);
    return item ? cloneRecord(item) : null;
  }

  async createCatalogItem(input: CatalogItemInput): Promise<CatalogItemRecord> {
    return this.mutateState((state) => {
      const item: CatalogItemRecord = {
        id: this.nextId(state, "catalog"),
        name: normalizeText(input.name),
        spaces: Array.from(new Set(input.spaces.map((space) => normalizeText(space)).filter(Boolean))),
        unit: normalizeText(input.unit),
        pricingMode: input.pricingMode,
        combinedUnitPrice: input.combinedUnitPrice,
        laborUnitPrice: input.laborUnitPrice,
        materialUnitPrice: input.materialUnitPrice,
        description: input.description?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        active: input.active ?? true,
        sortOrder: input.sortOrder ?? state.catalogItems.length,
      };

      this.validateCatalogItem(item);
      state.catalogItems.push(item);
      return cloneRecord(item);
    });
  }

  async updateCatalogItem(catalogItemId: string, input: CatalogItemUpdateInput): Promise<CatalogItemRecord> {
    return this.mutateState((state) => {
      const item = state.catalogItems.find((entry) => entry.id === catalogItemId);
      if (!item) {
        throw notFound("NOT_FOUND");
      }

      Object.assign(item, definedPatch(this.normalizeCatalogPatch(input)));

      this.validateCatalogItem(item);
      return cloneRecord(item);
    });
  }

  async deleteCatalogItem(catalogItemId: string): Promise<void> {
    await this.mutateState((state) => {
      const index = state.catalogItems.findIndex((item) => item.id === catalogItemId);
      if (index < 0) {
        throw notFound("NOT_FOUND");
      }

      state.catalogItems.splice(index, 1);
    });
  }

  private async mutateState<T>(mutator: (state: RepositoryState) => T | Promise<T>): Promise<T> {
    const state = await this.readState();
    const result = await mutator(state);
    await this.writeState(state);
    return result;
  }

  private async readState(): Promise<RepositoryState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      if (!raw.trim()) {
        return cloneState(DEFAULT_STATE);
      }

      return this.normalizeState(JSON.parse(raw) as Partial<RepositoryState>);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return cloneState(DEFAULT_STATE);
      }

      throw error;
    }
  }

  private async writeState(state: RepositoryState): Promise<void> {
    const fileDir = dirname(this.filePath);
    await mkdir(fileDir, { recursive: true });

    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(tempPath, this.filePath);
  }

  private normalizeState(state: Partial<RepositoryState>): RepositoryState {
    return {
      counters: {
        quote: state.counters?.quote ?? DEFAULT_STATE.counters.quote,
        space: state.counters?.space ?? DEFAULT_STATE.counters.space,
        item: state.counters?.item ?? DEFAULT_STATE.counters.item,
        adjustment: state.counters?.adjustment ?? DEFAULT_STATE.counters.adjustment,
        catalog: state.counters?.catalog ?? DEFAULT_STATE.counters.catalog,
      },
      quotes: Array.isArray(state.quotes) ? state.quotes.map((quote) => this.normalizeQuoteRecord(quote)) : [],
      catalogItems: Array.isArray(state.catalogItems)
        ? state.catalogItems.map((item) => this.normalizeCatalogRecord(item))
        : [],
    };
  }

  private normalizeQuoteRecord(record: QuoteRecord | Partial<QuoteRecord>): QuoteRecord {
    return {
      id: String(record.id ?? ""),
      quoteNo: String(record.quoteNo ?? ""),
      customerName: String(record.customerName ?? ""),
      customerPhone: record.customerPhone,
      projectName: String(record.projectName ?? ""),
      area: Number(record.area ?? 0),
      renovationType: String(record.renovationType ?? ""),
      address: record.address,
      notes: record.notes,
      status: (record.status ?? "draft") as QuoteStatus,
      version: Number(record.version ?? 1),
      createdAt: String(record.createdAt ?? nowIso()),
      updatedAt: String(record.updatedAt ?? nowIso()),
      spaces: Array.isArray(record.spaces)
        ? record.spaces.map((space) => this.normalizeSpaceRecord(space))
        : [],
      adjustments: Array.isArray(record.adjustments)
        ? record.adjustments.map((adjustment) => this.normalizeAdjustmentRecord(adjustment))
        : [],
    };
  }

  private normalizeSpaceRecord(record: QuoteSpaceRecord | Partial<QuoteSpaceRecord>): QuoteSpaceRecord {
    return {
      id: String(record.id ?? ""),
      name: String(record.name ?? ""),
      notes: record.notes,
      area: record.area,
      wallArea: record.wallArea,
      sortOrder: Number(record.sortOrder ?? 0),
      items: Array.isArray(record.items) ? record.items.map((item) => this.normalizeItemRecord(item)) : [],
    };
  }

  private normalizeItemRecord(record: QuoteItemRecord | Partial<QuoteItemRecord>): QuoteItemRecord {
    return {
      id: String(record.id ?? ""),
      sourceCatalogItemId: record.sourceCatalogItemId,
      name: String(record.name ?? ""),
      description: record.description,
      unit: String(record.unit ?? ""),
      quantity: Number(record.quantity ?? 0),
      pricingMode: (record.pricingMode ?? "combined") as QuoteItemRecord["pricingMode"],
      combinedUnitPrice: Number(record.combinedUnitPrice ?? 0),
      laborUnitPrice: Number(record.laborUnitPrice ?? 0),
      materialUnitPrice: Number(record.materialUnitPrice ?? 0),
      notes: record.notes,
      sortOrder: Number(record.sortOrder ?? 0),
    };
  }

  private normalizeAdjustmentRecord(
    record: QuoteAdjustmentRecord | Partial<QuoteAdjustmentRecord>,
  ): QuoteAdjustmentRecord {
    return {
      id: String(record.id ?? ""),
      kind: (record.kind ?? "charge") as QuoteAdjustmentRecord["kind"],
      name: String(record.name ?? ""),
      amount: Number(record.amount ?? 0),
      notes: record.notes,
      sortOrder: Number(record.sortOrder ?? 0),
    };
  }

  private normalizeCatalogRecord(record: CatalogItemRecord | Partial<CatalogItemRecord>): CatalogItemRecord {
    return {
      id: String(record.id ?? ""),
      name: String(record.name ?? ""),
      spaces: Array.isArray(record.spaces) ? record.spaces.map((space) => String(space)) : [],
      unit: String(record.unit ?? ""),
      pricingMode: (record.pricingMode ?? "combined") as CatalogItemRecord["pricingMode"],
      combinedUnitPrice: Number(record.combinedUnitPrice ?? 0),
      laborUnitPrice: Number(record.laborUnitPrice ?? 0),
      materialUnitPrice: Number(record.materialUnitPrice ?? 0),
      description: record.description,
      notes: record.notes,
      active: record.active ?? true,
      sortOrder: Number(record.sortOrder ?? 0),
    };
  }

  private createQuoteRecord(state: RepositoryState, input: QuoteInput, timestamp: string): QuoteRecord {
    const quoteSequence = this.nextSequence(state, "quote");
    const quote: QuoteRecord = {
      id: `quote_${quoteSequence}`,
      quoteNo: quoteNoFor(new Date(timestamp), quoteSequence),
      customerName: normalizeText(input.customerName),
      customerPhone: input.customerPhone?.trim() || undefined,
      projectName: normalizeText(input.projectName),
      area: input.area,
      renovationType: normalizeText(input.renovationType),
      address: input.address?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      status: input.status ?? "draft",
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      spaces: [],
      adjustments: [],
    };

    this.validateQuote(quote);
    return quote;
  }

  private nextId(state: RepositoryState, kind: keyof RepositoryState["counters"]): string {
    const counter = this.nextSequence(state, kind);
    return `${kind}_${counter}`;
  }

  private nextSequence(state: RepositoryState, kind: keyof RepositoryState["counters"]): number {
    const counter = state.counters[kind];
    state.counters[kind] += 1;
    return counter;
  }

  private resolvePersistentId(
    state: RepositoryState,
    kind: keyof RepositoryState["counters"],
    id?: string,
  ): string {
    if (id && !id.startsWith("temp_")) {
      return id;
    }

    return this.nextId(state, kind);
  }

  private requireQuote(state: RepositoryState, quoteId: string): QuoteRecord {
    const quote = state.quotes.find((entry) => entry.id === quoteId);
    if (!quote) {
      throw notFound("NOT_FOUND");
    }

    return quote;
  }

  private requireSpace(quote: QuoteRecord, spaceId: string): QuoteSpaceRecord {
    const space = quote.spaces.find((entry) => entry.id === spaceId);
    if (!space) {
      throw notFound("NOT_FOUND");
    }

    return space;
  }

  private requireItem(space: QuoteSpaceRecord, itemId: string): QuoteItemRecord {
    const item = space.items.find((entry) => entry.id === itemId);
    if (!item) {
      throw notFound("NOT_FOUND");
    }

    return item;
  }

  private requireAdjustment(quote: QuoteRecord, adjustmentId: string): QuoteAdjustmentRecord {
    const adjustment = quote.adjustments.find((entry) => entry.id === adjustmentId);
    if (!adjustment) {
      throw notFound("NOT_FOUND");
    }

    return adjustment;
  }

  private touchQuote(quote: QuoteRecord): void {
    quote.version += 1;
    quote.updatedAt = nowIso();
  }

  private validateQuote(quote: QuoteRecord): void {
    ensureFiniteNumber(quote.area, "Invalid area");
    if (quote.area < 0) {
      throw new Error("Invalid area");
    }
  }

  private validateItem(item: QuoteItemRecord): void {
    ensureFiniteNumber(item.quantity, "Invalid quantity");
    ensurePositiveMoney(item.combinedUnitPrice);
    ensurePositiveMoney(item.laborUnitPrice);
    ensurePositiveMoney(item.materialUnitPrice);
    if (item.quantity < 0) {
      throw new Error("Invalid quantity");
    }
  }

  private validateAdjustment(adjustment: QuoteAdjustmentRecord): void {
    ensurePositiveMoney(adjustment.amount);
  }

  private validateCatalogItem(item: CatalogItemRecord): void {
    ensurePositiveMoney(item.combinedUnitPrice);
    ensurePositiveMoney(item.laborUnitPrice);
    ensurePositiveMoney(item.materialUnitPrice);
  }

  private normalizeQuotePatch(input: QuoteUpdateInput): Partial<QuoteRecord> {
    return {
      customerName: input.customerName?.trim(),
      customerPhone: input.customerPhone?.trim(),
      projectName: input.projectName?.trim(),
      area: input.area,
      renovationType: input.renovationType?.trim(),
      address: input.address?.trim(),
      notes: input.notes?.trim(),
      status: input.status,
    };
  }

  private normalizeSpacePatch(input: QuoteSpaceUpdateInput): Partial<QuoteSpaceRecord> {
    return {
      name: input.name?.trim(),
      notes: input.notes?.trim(),
      area: input.area,
      wallArea: input.wallArea,
      sortOrder: input.sortOrder,
    };
  }

  private normalizeItemPatch(input: QuoteItemUpdateInput): Partial<QuoteItemRecord> {
    return {
      name: input.name?.trim(),
      description: input.description?.trim(),
      unit: input.unit?.trim(),
      quantity: input.quantity,
      pricingMode: input.pricingMode,
      combinedUnitPrice: input.combinedUnitPrice,
      laborUnitPrice: input.laborUnitPrice,
      materialUnitPrice: input.materialUnitPrice,
      notes: input.notes?.trim(),
      sortOrder: input.sortOrder,
      sourceCatalogItemId: input.sourceCatalogItemId,
    };
  }

  private normalizeAdjustmentPatch(input: QuoteAdjustmentUpdateInput): Partial<QuoteAdjustmentRecord> {
    return {
      kind: input.kind,
      name: input.name?.trim(),
      amount: input.amount,
      notes: input.notes?.trim(),
      sortOrder: input.sortOrder,
    };
  }

  private normalizeCatalogPatch(input: CatalogItemUpdateInput): Partial<CatalogItemRecord> {
    return {
      name: input.name?.trim(),
      spaces: input.spaces?.map((space) => normalizeText(space)).filter(Boolean),
      unit: input.unit?.trim(),
      pricingMode: input.pricingMode,
      combinedUnitPrice: input.combinedUnitPrice,
      laborUnitPrice: input.laborUnitPrice,
      materialUnitPrice: input.materialUnitPrice,
      description: input.description?.trim(),
      notes: input.notes?.trim(),
      active: input.active,
      sortOrder: input.sortOrder,
    };
  }
}
