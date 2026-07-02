/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

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
  type QuoteDraftAdjustmentInput,
  type QuoteDraftSpaceInput,
  type QuoteInput,
  type QuoteItemInput,
  type QuoteItemRecord,
  type QuoteItemUpdateInput,
  type QuoteRecord,
  type QuoteSpaceInput,
  type QuoteSpaceRecord,
  type QuoteSpaceUpdateInput,
  type QuoteSummary,
  type QuoteUpdateInput,
  type QuotationRepository,
  versionConflict,
} from "@/server/repositories/quotation-repository";

type SupabaseQuotationRepositoryOptions = Readonly<{
  url?: string;
  serviceRoleKey?: string;
  schema?: string;
}>;

type QuoteRow = {
  id: string;
  quote_no: string;
  customer_name: string;
  customer_phone: string | null;
  project_name: string;
  area: number;
  renovation_type: string;
  address: string | null;
  notes: string | null;
  status: "draft" | "confirmed";
  version: number;
  created_at: string;
  updated_at: string;
  quote_spaces?: SpaceRow[];
  quote_adjustments?: AdjustmentRow[];
};

type SpaceRow = {
  id: string;
  quote_id: string;
  name: string;
  notes: string | null;
  area: number | null;
  wall_area: number | null;
  sort_order: number;
  quote_items?: ItemRow[];
};

type ItemRow = {
  id: string;
  quote_id: string;
  space_id: string;
  source_catalog_item_id: string | null;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  pricing_mode: "combined" | "split";
  combined_unit_price: number;
  labor_unit_price: number;
  material_unit_price: number;
  notes: string | null;
  sort_order: number;
};

type AdjustmentRow = {
  id: string;
  quote_id: string;
  kind: "charge" | "discount";
  name: string;
  amount: number;
  notes: string | null;
  sort_order: number;
};

type CatalogRow = {
  id: string;
  name: string;
  spaces: string[];
  unit: string;
  pricing_mode: "combined" | "split";
  combined_unit_price: number;
  labor_unit_price: number;
  material_unit_price: number;
  description: string | null;
  notes: string | null;
  active: boolean;
  sort_order: number;
};

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

function nowIso(): string {
  return new Date().toISOString();
}

function quoteNoFor(date: Date, sequence: number): string {
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `ZD-${stamp}-${String(sequence).padStart(3, "0")}`;
}

function normalizeText(value: string): string {
  return value.trim();
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

function toNullableText(value?: string): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function computeSummary(quote: QuoteRecord): QuoteSummary {
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
}

function normalizeQuotePatch(input: QuoteUpdateInput): Partial<QuoteRecord> {
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

function definedPatch<T extends Record<string, unknown>>(patch: T): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<T>;
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

function toCatalogRecord(row: CatalogRow): CatalogItemRecord {
  return {
    id: row.id,
    name: row.name,
    spaces: row.spaces,
    unit: row.unit,
    pricingMode: row.pricing_mode,
    combinedUnitPrice: row.combined_unit_price,
    laborUnitPrice: row.labor_unit_price,
    materialUnitPrice: row.material_unit_price,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

function toQuoteRecord(row: QuoteRow): QuoteRecord {
  return {
    id: row.id,
    quoteNo: row.quote_no,
    customerName: row.customer_name,
    customerPhone: row.customer_phone ?? undefined,
    projectName: row.project_name,
    area: row.area,
    renovationType: row.renovation_type,
    address: row.address ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    spaces: (row.quote_spaces ?? [])
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((space) => ({
        id: space.id,
        name: space.name,
        notes: space.notes ?? undefined,
        area: space.area ?? undefined,
        wallArea: space.wall_area ?? undefined,
        sortOrder: space.sort_order,
        items: (space.quote_items ?? [])
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((item) => ({
            id: item.id,
            sourceCatalogItemId: item.source_catalog_item_id ?? undefined,
            name: item.name,
            description: item.description ?? undefined,
            unit: item.unit,
            quantity: item.quantity,
            pricingMode: item.pricing_mode,
            combinedUnitPrice: item.combined_unit_price,
            laborUnitPrice: item.labor_unit_price,
            materialUnitPrice: item.material_unit_price,
            notes: item.notes ?? undefined,
            sortOrder: item.sort_order,
          })),
      })),
    adjustments: (row.quote_adjustments ?? [])
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((adjustment) => ({
        id: adjustment.id,
        kind: adjustment.kind,
        name: adjustment.name,
        amount: adjustment.amount,
        notes: adjustment.notes ?? undefined,
        sortOrder: adjustment.sort_order,
      })),
  };
}

export class SupabaseQuotationRepository implements QuotationRepository {
  private readonly client: ReturnType<typeof createClient<any, any, any>>;

  constructor(options: SupabaseQuotationRepositoryOptions = {}) {
    const url = options.url ?? process.env.SUPABASE_URL;
    const serviceRoleKey = options.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      throw new Error("SUPABASE_ENV_MISSING");
    }

    this.client = createClient<any, any, any>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async listQuotes(query = ""): Promise<QuoteSummary[]> {
    const { data, error } = await this.client
      .from("quotes")
      .select(`
        id,
        quote_no,
        customer_name,
        customer_phone,
        project_name,
        area,
        renovation_type,
        address,
        notes,
        status,
        version,
        created_at,
        updated_at,
        quote_spaces (
          id,
          quote_id,
          name,
          notes,
          area,
          wall_area,
          sort_order,
          quote_items (
            id,
            quote_id,
            space_id,
            source_catalog_item_id,
            name,
            description,
            unit,
            quantity,
            pricing_mode,
            combined_unit_price,
            labor_unit_price,
            material_unit_price,
            notes,
            sort_order
          )
        ),
        quote_adjustments (
          id,
          quote_id,
          kind,
          name,
          amount,
          notes,
          sort_order
        )
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const normalizedQuery = normalizeText(query);
    return (data as QuoteRow[])
      .map((row) => toQuoteRecord(row))
      .filter((quote) => {
        if (!normalizedQuery) {
          return true;
        }

        return [quote.customerName, quote.projectName, quote.quoteNo, quote.address ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery.toLowerCase());
      })
      .map((quote) => computeSummary(quote));
  }

  async getQuote(quoteId: string): Promise<QuoteRecord | null> {
    const row = await this.fetchQuoteRow(quoteId);
    return row ? toQuoteRecord(row) : null;
  }

  async createQuote(input: QuoteInput): Promise<QuoteRecord> {
    this.validateQuoteInput(input.area);

    const timestamp = nowIso();
    const quoteNo = await this.generateQuoteNo(new Date(timestamp));
    const id = randomUUID();

    const { error } = await this.client.from("quotes").insert({
      id,
      quote_no: quoteNo,
      customer_name: normalizeText(input.customerName),
      customer_phone: toNullableText(input.customerPhone),
      project_name: normalizeText(input.projectName),
      area: input.area,
      renovation_type: normalizeText(input.renovationType),
      address: toNullableText(input.address),
      notes: toNullableText(input.notes),
      status: input.status ?? "draft",
      version: 1,
      created_at: timestamp,
      updated_at: timestamp,
    });

    if (error) {
      throw error;
    }

    return this.requireQuoteDocument(id);
  }

  async updateQuote(quoteId: string, version: number, input: QuoteUpdateInput): Promise<QuoteRecord> {
    const existing = await this.requireQuoteDocument(quoteId);
    if (existing.version !== version) {
      throw versionConflict("VERSION_CONFLICT");
    }

    if (input.area !== undefined) {
      this.validateQuoteInput(input.area);
    }

    const patch = definedPatch(normalizeQuotePatch(input));
    const updatedAt = nowIso();
    const { error } = await this.client
      .from("quotes")
      .update({
        customer_name: patch.customerName,
        customer_phone: patch.customerPhone ? patch.customerPhone : patch.customerPhone === "" ? null : undefined,
        project_name: patch.projectName,
        area: patch.area,
        renovation_type: patch.renovationType,
        address: patch.address ? patch.address : patch.address === "" ? null : undefined,
        notes: patch.notes ? patch.notes : patch.notes === "" ? null : undefined,
        status: patch.status,
        version: version + 1,
        updated_at: updatedAt,
      })
      .eq("id", quoteId);

    if (error) {
      throw error;
    }

    return this.requireQuoteDocument(quoteId);
  }

  async saveQuoteDocument(quoteId: string, version: number, input: QuoteDocumentInput): Promise<QuoteRecord> {
    const existing = await this.requireQuoteDocument(quoteId);
    if (existing.version !== version) {
      throw versionConflict("VERSION_CONFLICT");
    }

    const updatedAt = nowIso();
    const { error } = await this.client
      .from("quotes")
      .update({
        customer_name: input.customerName ? normalizeText(input.customerName) : existing.customerName,
        customer_phone: input.customerPhone === undefined ? existing.customerPhone ?? null : toNullableText(input.customerPhone),
        project_name: input.projectName ? normalizeText(input.projectName) : existing.projectName,
        area: input.area ?? existing.area,
        renovation_type: input.renovationType ? normalizeText(input.renovationType) : existing.renovationType,
        address: input.address === undefined ? existing.address ?? null : toNullableText(input.address),
        notes: input.notes === undefined ? existing.notes ?? null : toNullableText(input.notes),
        status: input.status ?? existing.status,
        version: version + 1,
        updated_at: updatedAt,
      })
      .eq("id", quoteId);

    if (error) {
      throw error;
    }

    await this.replaceQuoteChildren(quoteId, input.spaces, input.adjustments);
    return this.requireQuoteDocument(quoteId);
  }

  async copyQuote(quoteId: string): Promise<QuoteRecord> {
    const source = await this.requireQuoteDocument(quoteId);
    const timestamp = nowIso();
    const id = randomUUID();
    const quoteNo = await this.generateQuoteNo(new Date(timestamp));

    const { error } = await this.client.from("quotes").insert({
      id,
      quote_no: quoteNo,
      customer_name: `${source.customerName}副本`,
      customer_phone: source.customerPhone ?? null,
      project_name: source.projectName,
      area: source.area,
      renovation_type: source.renovationType,
      address: source.address ?? null,
      notes: source.notes ?? null,
      status: source.status,
      version: 1,
      created_at: timestamp,
      updated_at: timestamp,
    });

    if (error) {
      throw error;
    }

    await this.replaceQuoteChildren(
      id,
      source.spaces.map((space) => ({
        name: space.name,
        notes: space.notes,
        area: space.area,
        wallArea: space.wallArea,
        sortOrder: space.sortOrder,
        items: space.items.map((item) => ({
          sourceCatalogItemId: item.sourceCatalogItemId,
          name: item.name,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          pricingMode: item.pricingMode,
          combinedUnitPrice: item.combinedUnitPrice,
          laborUnitPrice: item.laborUnitPrice,
          materialUnitPrice: item.materialUnitPrice,
          notes: item.notes,
          sortOrder: item.sortOrder,
        })),
      })),
      source.adjustments.map((adjustment) => ({
        kind: adjustment.kind,
        name: adjustment.name,
        amount: adjustment.amount,
        notes: adjustment.notes,
        sortOrder: adjustment.sortOrder,
      })),
    );

    return this.requireQuoteDocument(id);
  }

  async deleteQuote(quoteId: string): Promise<void> {
    const { error, count } = await this.client.from("quotes").delete({ count: "exact" }).eq("id", quoteId);
    if (error) {
      throw error;
    }
    if (!count) {
      throw notFound("NOT_FOUND");
    }
  }

  async createSpace(quoteId: string, input: QuoteSpaceInput): Promise<QuoteSpaceRecord> {
    const saved = await this.mutateQuoteDocument(quoteId, (quote) => {
      quote.spaces.push({
        id: randomUUID(),
        name: normalizeText(input.name),
        notes: input.notes?.trim() || undefined,
        area: input.area,
        wallArea: input.wallArea,
        sortOrder: input.sortOrder ?? quote.spaces.length,
        items: [],
      });
    });

    return saved.spaces.at(-1) as QuoteSpaceRecord;
  }

  async updateSpace(quoteId: string, spaceId: string, input: QuoteSpaceUpdateInput): Promise<QuoteSpaceRecord> {
    const saved = await this.mutateQuoteDocument(quoteId, (quote) => {
      const space = quote.spaces.find((entry) => entry.id === spaceId);
      if (!space) {
        throw notFound("NOT_FOUND");
      }

      Object.assign(
        space,
        definedPatch({
          name: input.name?.trim(),
          notes: input.notes?.trim(),
          area: input.area,
          wallArea: input.wallArea,
          sortOrder: input.sortOrder,
        }),
      );
    });

    return saved.spaces.find((space) => space.id === spaceId) as QuoteSpaceRecord;
  }

  async reorderSpaces(quoteId: string, orderedSpaceIds: readonly string[]): Promise<QuoteRecord> {
    return this.mutateQuoteDocument(quoteId, (quote) => {
      (quote as Mutable<QuoteRecord>).spaces = updateOrdering([...quote.spaces], orderedSpaceIds);
    });
  }

  async deleteSpace(quoteId: string, spaceId: string): Promise<void> {
    await this.mutateQuoteDocument(quoteId, (quote) => {
      const nextSpaces = quote.spaces.filter((space) => space.id !== spaceId);
      if (nextSpaces.length === quote.spaces.length) {
        throw notFound("NOT_FOUND");
      }
      (quote as Mutable<QuoteRecord>).spaces = nextSpaces;
    });
  }

  async createItem(quoteId: string, spaceId: string, input: QuoteItemInput): Promise<QuoteItemRecord> {
    const itemId = randomUUID();
    const saved = await this.mutateQuoteDocument(quoteId, (quote) => {
      const space = quote.spaces.find((entry) => entry.id === spaceId);
      if (!space) {
        throw notFound("NOT_FOUND");
      }

      this.validateItemInput(input);
      space.items.push({
        id: itemId,
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
      });
    });

    for (const space of saved.spaces) {
      const item = space.items.find((entry) => entry.id === itemId);
      if (item) {
        return item;
      }
    }

    throw notFound("NOT_FOUND");
  }

  async updateItem(quoteId: string, spaceId: string, itemId: string, input: QuoteItemUpdateInput): Promise<QuoteItemRecord> {
    const saved = await this.mutateQuoteDocument(quoteId, (quote) => {
      const space = quote.spaces.find((entry) => entry.id === spaceId);
      if (!space) {
        throw notFound("NOT_FOUND");
      }

      const item = space.items.find((entry) => entry.id === itemId);
      if (!item) {
        throw notFound("NOT_FOUND");
      }

      Object.assign(
        item,
        definedPatch({
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
        }),
      );

      this.validateItemRecord(item);
    });

    for (const space of saved.spaces) {
      const item = space.items.find((entry) => entry.id === itemId);
      if (item) {
        return item;
      }
    }

    throw notFound("NOT_FOUND");
  }

  async reorderItems(quoteId: string, spaceId: string, orderedItemIds: readonly string[]): Promise<QuoteRecord> {
    return this.mutateQuoteDocument(quoteId, (quote) => {
      const space = quote.spaces.find((entry) => entry.id === spaceId);
      if (!space) {
        throw notFound("NOT_FOUND");
      }
      (space as Mutable<QuoteSpaceRecord>).items = updateOrdering([...space.items], orderedItemIds);
    });
  }

  async deleteItem(quoteId: string, spaceId: string, itemId: string): Promise<void> {
    await this.mutateQuoteDocument(quoteId, (quote) => {
      const space = quote.spaces.find((entry) => entry.id === spaceId);
      if (!space) {
        throw notFound("NOT_FOUND");
      }

      const nextItems = space.items.filter((item) => item.id !== itemId);
      if (nextItems.length === space.items.length) {
        throw notFound("NOT_FOUND");
      }
      (space as Mutable<QuoteSpaceRecord>).items = nextItems;
    });
  }

  async createAdjustment(quoteId: string, input: QuoteAdjustmentInput): Promise<QuoteAdjustmentRecord> {
    const adjustmentId = randomUUID();
    const saved = await this.mutateQuoteDocument(quoteId, (quote) => {
      this.validateAdjustmentInput(input.amount);
      quote.adjustments.push({
        id: adjustmentId,
        kind: input.kind,
        name: normalizeText(input.name),
        amount: input.amount,
        notes: input.notes?.trim() || undefined,
        sortOrder: input.sortOrder ?? quote.adjustments.length,
      });
    });

    return saved.adjustments.find((adjustment) => adjustment.id === adjustmentId) as QuoteAdjustmentRecord;
  }

  async updateAdjustment(
    quoteId: string,
    adjustmentId: string,
    input: QuoteAdjustmentUpdateInput,
  ): Promise<QuoteAdjustmentRecord> {
    const saved = await this.mutateQuoteDocument(quoteId, (quote) => {
      const adjustment = quote.adjustments.find((entry) => entry.id === adjustmentId);
      if (!adjustment) {
        throw notFound("NOT_FOUND");
      }

      Object.assign(
        adjustment,
        definedPatch({
          kind: input.kind,
          name: input.name?.trim(),
          amount: input.amount,
          notes: input.notes?.trim(),
          sortOrder: input.sortOrder,
        }),
      );
      this.validateAdjustmentInput(adjustment.amount);
    });

    return saved.adjustments.find((adjustment) => adjustment.id === adjustmentId) as QuoteAdjustmentRecord;
  }

  async reorderAdjustments(quoteId: string, orderedAdjustmentIds: readonly string[]): Promise<QuoteRecord> {
    return this.mutateQuoteDocument(quoteId, (quote) => {
      (quote as Mutable<QuoteRecord>).adjustments = updateOrdering([...quote.adjustments], orderedAdjustmentIds);
    });
  }

  async deleteAdjustment(quoteId: string, adjustmentId: string): Promise<void> {
    await this.mutateQuoteDocument(quoteId, (quote) => {
      const nextAdjustments = quote.adjustments.filter((adjustment) => adjustment.id !== adjustmentId);
      if (nextAdjustments.length === quote.adjustments.length) {
        throw notFound("NOT_FOUND");
      }
      (quote as Mutable<QuoteRecord>).adjustments = nextAdjustments;
    });
  }

  async listCatalogItems(
    query?: string | Readonly<{ query?: string; space?: string; activeOnly?: boolean }>,
  ): Promise<CatalogItemRecord[]> {
    const filter = typeof query === "string" ? { query } : query ?? {};
    const { data, error } = await this.client.from("catalog_items").select("*").order("sort_order", { ascending: true });

    if (error) {
      throw error;
    }

    const normalizedQuery = normalizeText(filter.query ?? "").toLowerCase();
    return (data as CatalogRow[])
      .map((row) => toCatalogRecord(row))
      .filter((item) => {
        if (filter.activeOnly && !item.active) {
          return false;
        }

        if (filter.space && !item.spaces.includes(filter.space)) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [item.name, item.description ?? "", item.unit, item.spaces.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }

  async getCatalogItem(catalogItemId: string): Promise<CatalogItemRecord | null> {
    const { data, error } = await this.client.from("catalog_items").select("*").eq("id", catalogItemId).maybeSingle();
    if (error) {
      throw error;
    }
    return data ? toCatalogRecord(data as CatalogRow) : null;
  }

  async createCatalogItem(input: CatalogItemInput): Promise<CatalogItemRecord> {
    this.validateCatalogItemInput(input);
    const id = randomUUID();
    const { error } = await this.client.from("catalog_items").insert({
      id,
      name: normalizeText(input.name),
      spaces: Array.from(new Set(input.spaces.map((space) => normalizeText(space)).filter(Boolean))),
      unit: normalizeText(input.unit),
      pricing_mode: input.pricingMode,
      combined_unit_price: input.combinedUnitPrice,
      labor_unit_price: input.laborUnitPrice,
      material_unit_price: input.materialUnitPrice,
      description: toNullableText(input.description),
      notes: toNullableText(input.notes),
      active: input.active ?? true,
      sort_order: input.sortOrder ?? 0,
    });

    if (error) {
      throw error;
    }

    return (await this.getCatalogItem(id)) as CatalogItemRecord;
  }

  async updateCatalogItem(catalogItemId: string, input: CatalogItemUpdateInput): Promise<CatalogItemRecord> {
    const existing = await this.getCatalogItem(catalogItemId);
    if (!existing) {
      throw notFound("NOT_FOUND");
    }

    const merged: CatalogItemRecord = {
      ...existing,
      ...definedPatch({
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
      }),
    };

    this.validateCatalogItemInput(merged);

    const { error } = await this.client
      .from("catalog_items")
      .update({
        name: merged.name,
        spaces: merged.spaces,
        unit: merged.unit,
        pricing_mode: merged.pricingMode,
        combined_unit_price: merged.combinedUnitPrice,
        labor_unit_price: merged.laborUnitPrice,
        material_unit_price: merged.materialUnitPrice,
        description: toNullableText(merged.description),
        notes: toNullableText(merged.notes),
        active: merged.active,
        sort_order: merged.sortOrder,
      })
      .eq("id", catalogItemId);

    if (error) {
      throw error;
    }

    return (await this.getCatalogItem(catalogItemId)) as CatalogItemRecord;
  }

  async deleteCatalogItem(catalogItemId: string): Promise<void> {
    const { error, count } = await this.client.from("catalog_items").delete({ count: "exact" }).eq("id", catalogItemId);
    if (error) {
      throw error;
    }
    if (!count) {
      throw notFound("NOT_FOUND");
    }
  }

  private async fetchQuoteRow(quoteId: string): Promise<QuoteRow | null> {
    const { data, error } = await this.client
      .from("quotes")
      .select(`
        id,
        quote_no,
        customer_name,
        customer_phone,
        project_name,
        area,
        renovation_type,
        address,
        notes,
        status,
        version,
        created_at,
        updated_at,
        quote_spaces (
          id,
          quote_id,
          name,
          notes,
          area,
          wall_area,
          sort_order,
          quote_items (
            id,
            quote_id,
            space_id,
            source_catalog_item_id,
            name,
            description,
            unit,
            quantity,
            pricing_mode,
            combined_unit_price,
            labor_unit_price,
            material_unit_price,
            notes,
            sort_order
          )
        ),
        quote_adjustments (
          id,
          quote_id,
          kind,
          name,
          amount,
          notes,
          sort_order
        )
      `)
      .eq("id", quoteId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as QuoteRow | null) ?? null;
  }

  private async requireQuoteDocument(quoteId: string): Promise<QuoteRecord> {
    const row = await this.fetchQuoteRow(quoteId);
    if (!row) {
      throw notFound("NOT_FOUND");
    }
    return toQuoteRecord(row);
  }

  private async mutateQuoteDocument(
    quoteId: string,
    mutator: (quote: QuoteRecord) => void,
  ): Promise<QuoteRecord> {
    const quote = cloneRecord(await this.requireQuoteDocument(quoteId));
    mutator(quote);
    return this.saveQuoteDocument(quoteId, quote.version, this.toQuoteDocumentInput(quote));
  }

  private toQuoteDocumentInput(quote: QuoteRecord): QuoteDocumentInput {
    return {
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      projectName: quote.projectName,
      area: quote.area,
      renovationType: quote.renovationType,
      address: quote.address,
      notes: quote.notes,
      status: quote.status,
      spaces: quote.spaces.map((space) => ({
        id: space.id,
        name: space.name,
        notes: space.notes,
        area: space.area,
        wallArea: space.wallArea,
        sortOrder: space.sortOrder,
        items: space.items.map((item) => ({
          id: item.id,
          sourceCatalogItemId: item.sourceCatalogItemId,
          name: item.name,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          pricingMode: item.pricingMode,
          combinedUnitPrice: item.combinedUnitPrice,
          laborUnitPrice: item.laborUnitPrice,
          materialUnitPrice: item.materialUnitPrice,
          notes: item.notes,
          sortOrder: item.sortOrder,
        })),
      })),
      adjustments: quote.adjustments.map((adjustment) => ({
        id: adjustment.id,
        kind: adjustment.kind,
        name: adjustment.name,
        amount: adjustment.amount,
        notes: adjustment.notes,
        sortOrder: adjustment.sortOrder,
      })),
    };
  }

  private async replaceQuoteChildren(
    quoteId: string,
    spaces: readonly QuoteDraftSpaceInput[],
    adjustments: readonly QuoteDraftAdjustmentInput[],
  ): Promise<void> {
    const { error: deleteAdjustmentsError } = await this.client.from("quote_adjustments").delete().eq("quote_id", quoteId);
    if (deleteAdjustmentsError) {
      throw deleteAdjustmentsError;
    }

    const { error: deleteSpacesError } = await this.client.from("quote_spaces").delete().eq("quote_id", quoteId);
    if (deleteSpacesError) {
      throw deleteSpacesError;
    }

    const normalizedSpaces = spaces
      .map((space, spaceIndex) => {
        const nextSpace = {
          id: space.id && !space.id.startsWith("temp_") ? space.id : randomUUID(),
          quote_id: quoteId,
          name: normalizeText(space.name),
          notes: toNullableText(space.notes),
          area: space.area ?? null,
          wall_area: space.wallArea ?? null,
          sort_order: space.sortOrder ?? spaceIndex,
        };

        space.items.forEach((item) => this.validateItemInput(item));
        return {
          row: nextSpace,
          items: space.items.map((item, itemIndex) => ({
            id: item.id && !item.id.startsWith("temp_") ? item.id : randomUUID(),
            quote_id: quoteId,
            space_id: nextSpace.id,
            source_catalog_item_id: item.sourceCatalogItemId ?? null,
            name: normalizeText(item.name),
            description: toNullableText(item.description),
            unit: normalizeText(item.unit),
            quantity: item.quantity,
            pricing_mode: item.pricingMode,
            combined_unit_price: item.combinedUnitPrice,
            labor_unit_price: item.laborUnitPrice,
            material_unit_price: item.materialUnitPrice,
            notes: toNullableText(item.notes),
            sort_order: item.sortOrder ?? itemIndex,
          })),
        };
      })
      .sort((left, right) => left.row.sort_order - right.row.sort_order);

    if (normalizedSpaces.length > 0) {
      const { error: insertSpacesError } = await this.client
        .from("quote_spaces")
        .insert(normalizedSpaces.map((entry) => entry.row));
      if (insertSpacesError) {
        throw insertSpacesError;
      }
    }

    const items = normalizedSpaces.flatMap((entry) => entry.items);
    if (items.length > 0) {
      const { error: insertItemsError } = await this.client.from("quote_items").insert(items);
      if (insertItemsError) {
        throw insertItemsError;
      }
    }

    adjustments.forEach((adjustment) => this.validateAdjustmentInput(adjustment.amount));
    if (adjustments.length > 0) {
      const { error: insertAdjustmentsError } = await this.client.from("quote_adjustments").insert(
        adjustments.map((adjustment, index) => ({
          id: adjustment.id && !adjustment.id.startsWith("temp_") ? adjustment.id : randomUUID(),
          quote_id: quoteId,
          kind: adjustment.kind,
          name: normalizeText(adjustment.name),
          amount: adjustment.amount,
          notes: toNullableText(adjustment.notes),
          sort_order: adjustment.sortOrder ?? index,
        })),
      );
      if (insertAdjustmentsError) {
        throw insertAdjustmentsError;
      }
    }
  }

  private async generateQuoteNo(date: Date): Promise<string> {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const { count, error } = await this.client
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());

    if (error) {
      throw error;
    }

    return quoteNoFor(date, (count ?? 0) + 1);
  }

  private validateQuoteInput(area: number): void {
    ensureFiniteNumber(area, "Invalid area");
    if (area < 0) {
      throw new Error("Invalid area");
    }
  }

  private validateItemInput(input: Pick<QuoteItemInput | QuoteItemRecord, "quantity" | "combinedUnitPrice" | "laborUnitPrice" | "materialUnitPrice">): void {
    ensureFiniteNumber(input.quantity, "Invalid quantity");
    ensurePositiveMoney(input.combinedUnitPrice);
    ensurePositiveMoney(input.laborUnitPrice);
    ensurePositiveMoney(input.materialUnitPrice);
    if (input.quantity < 0) {
      throw new Error("Invalid quantity");
    }
  }

  private validateItemRecord(item: QuoteItemRecord): void {
    this.validateItemInput(item);
  }

  private validateAdjustmentInput(amount: number): void {
    ensurePositiveMoney(amount);
  }

  private validateCatalogItemInput(
    input: Pick<
      CatalogItemInput | CatalogItemRecord,
      "combinedUnitPrice" | "laborUnitPrice" | "materialUnitPrice"
    >,
  ): void {
    ensurePositiveMoney(input.combinedUnitPrice);
    ensurePositiveMoney(input.laborUnitPrice);
    ensurePositiveMoney(input.materialUnitPrice);
  }
}
