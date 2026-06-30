"use client";

import { useReducer, useState } from "react";

import {
  calculateItemBreakdown,
  calculateQuoteTotals,
  calculateSpaceTotal,
} from "@/domain/quotation";
import { formatCents } from "@/lib/money";
import type {
  CatalogItemRecord,
  QuoteItemRecord,
  QuoteRecord,
  QuoteSpaceRecord,
} from "@/server/repositories/quotation-repository";
import { CatalogPicker } from "@/components/quote-editor/catalog-picker";
import { ItemTable } from "@/components/quote-editor/item-table";
import { SpaceNav } from "@/components/quote-editor/space-nav";
import { SummaryPanel } from "@/components/quote-editor/summary-panel";
import { useAutosave } from "@/components/quote-editor/use-autosave";

type QuoteEditorProps = Readonly<{
  initialQuote: QuoteRecord;
  catalogItems: readonly CatalogItemRecord[];
  onSave?: (quote: QuoteRecord, version: number) => Promise<{ version: number }>;
  saveUrl?: string;
}>;

type EditorState = Readonly<{
  quote: QuoteRecord;
  activeSpaceId: string;
}>;

type EditorAction =
  | { type: "select-space"; spaceId: string }
  | { type: "update-item"; spaceId: string; itemId: string; patch: Partial<QuoteItemRecord> }
  | { type: "add-catalog-items"; spaceId: string; items: CatalogItemRecord[] }
  | { type: "delete-space"; spaceId: string }
  | { type: "add-space" };

function createTempId(prefix: string): string {
  return `temp_${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "select-space":
      return { ...state, activeSpaceId: action.spaceId };
    case "update-item":
      return {
        ...state,
        quote: {
          ...state.quote,
          spaces: state.quote.spaces.map((space) =>
            space.id !== action.spaceId
              ? space
              : {
                  ...space,
                  items: space.items.map((item) =>
                    item.id !== action.itemId ? item : { ...item, ...action.patch },
                  ),
                },
          ),
        },
      };
    case "add-catalog-items": {
      return {
        ...state,
        quote: {
          ...state.quote,
          spaces: state.quote.spaces.map((space) =>
            space.id !== action.spaceId
              ? space
              : {
                  ...space,
                  items: [
                    ...space.items,
                    ...action.items.map((item, index) => ({
                      id: createTempId("item"),
                      sourceCatalogItemId: item.id,
                      name: item.name,
                      description: item.description,
                      unit: item.unit,
                      quantity: 1,
                      pricingMode: item.pricingMode,
                      combinedUnitPrice: item.combinedUnitPrice,
                      laborUnitPrice: item.laborUnitPrice,
                      materialUnitPrice: item.materialUnitPrice,
                      notes: item.notes,
                      sortOrder: space.items.length + index,
                    })),
                  ],
                },
          ),
        },
      };
    }
    case "delete-space": {
      const remainingSpaces = state.quote.spaces.filter((space) => space.id !== action.spaceId);
      const nextActiveSpaceId = remainingSpaces[0]?.id ?? "";
      return {
        activeSpaceId: nextActiveSpaceId,
        quote: {
          ...state.quote,
          spaces: remainingSpaces,
        },
      };
    }
    case "add-space": {
      const nextSpace: QuoteSpaceRecord = {
        id: createTempId("space"),
        name: `新增空间 ${state.quote.spaces.length + 1}`,
        sortOrder: state.quote.spaces.length,
        items: [],
      };
      return {
        activeSpaceId: nextSpace.id,
        quote: {
          ...state.quote,
          spaces: [...state.quote.spaces, nextSpace],
        },
      };
    }
  }
}

function computeTotals(quote: QuoteRecord) {
  return calculateQuoteTotals(
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
}

export function QuoteEditor({ initialQuote, catalogItems, onSave, saveUrl }: QuoteEditorProps) {
  const [state, dispatch] = useReducer(reducer, {
    quote: initialQuote,
    activeSpaceId: initialQuote.spaces[0]?.id ?? "",
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const activeSpace =
    state.quote.spaces.find((space) => space.id === state.activeSpaceId) ?? state.quote.spaces[0] ?? null;
  const totals = computeTotals(state.quote);
  async function handleSave(quote: QuoteRecord, version: number) {
    if (onSave) {
      return onSave(quote, version);
    }

    if (!saveUrl) {
      throw new Error("SAVE_UNAVAILABLE");
    }

    const response = await fetch(saveUrl, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        version,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        projectName: quote.projectName,
        area: quote.area,
        renovationType: quote.renovationType,
        address: quote.address,
        notes: quote.notes,
        status: quote.status,
        spaces: quote.spaces,
        adjustments: quote.adjustments,
      }),
    });

    const payload = (await response.json()) as
      | { data: { version: number } }
      | { error: { code: string; message: string } };

    if (!response.ok) {
      const error = new Error("Save failed") as Error & { code?: string };
      error.code = "error" in payload ? payload.error.code : "SAVE_FAILED";
      throw error;
    }

    if ("data" in payload) {
      return { version: payload.data.version };
    }

    throw new Error("SAVE_FAILED");
  }

  const autosave = useAutosave({
    draft: state.quote,
    version: state.quote.version,
    onSave: handleSave,
  });

  return (
    <section className="editor-layout">
      <SpaceNav
        spaces={state.quote.spaces.map((space) => ({
          id: space.id,
          name: space.name,
          itemCount: space.items.length,
        }))}
        activeSpaceId={activeSpace?.id ?? ""}
        onAddSpace={() => dispatch({ type: "add-space" })}
        onDeleteSpace={() => setDeleteConfirmOpen(true)}
        onSelect={(spaceId) => dispatch({ type: "select-space", spaceId })}
      />

      <div className="editor-main card stack">
        <div className="editor-main__header">
          <div>
            <p className="page-kicker">编辑报价</p>
            <h2>{state.quote.projectName}</h2>
            {activeSpace ? <p className="muted">当前空间：{activeSpace.name}</p> : null}
          </div>
          <button className="button focus-ring" onClick={() => setPickerOpen(true)} type="button">
            从项目库添加
          </button>
        </div>

        {activeSpace ? (
          <>
            <ItemTable
              items={activeSpace.items}
              onChangeItem={(itemId, patch) =>
                dispatch({
                  type: "update-item",
                  spaceId: activeSpace.id,
                  itemId,
                  patch,
                })
              }
            />
            <div className="editor-current-total">
              当前空间小计：{
                formatCents(
                  calculateSpaceTotal(
                    activeSpace.items.map((item) => {
                      const breakdown = calculateItemBreakdown(item);
                      return {
                        total: breakdown.total,
                        labor: breakdown.laborTotal,
                        material: breakdown.materialTotal,
                      };
                    }),
                  ).total,
                )
              }
            </div>
          </>
        ) : (
          <p className="empty-state">当前没有可编辑的空间。</p>
        )}
      </div>

      <SummaryPanel
        adjustmentTotal={totals.adjustmentTotal}
        autosaveStatus={autosave.status}
        grandTotal={totals.grandTotal}
        subtotal={totals.subtotal}
      />

      <CatalogPicker
        currentSpaceName={activeSpace?.name ?? ""}
        items={catalogItems}
        onAddItems={(items) => {
          if (!activeSpace) {
            return;
          }
          dispatch({ type: "add-catalog-items", spaceId: activeSpace.id, items });
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
        open={pickerOpen}
      />

      {deleteConfirmOpen ? (
        <div aria-label="删除空间确认" className="dialog-backdrop" role="dialog">
          <div className="dialog-card stack">
            <h2>删除空间确认</h2>
            <p>删除当前空间后，该空间下的项目将一并移除。</p>
            <div className="dialog-actions">
              <button className="button button--ghost focus-ring" onClick={() => setDeleteConfirmOpen(false)} type="button">
                取消
              </button>
              <button
                className="button button--danger focus-ring"
                onClick={() => {
                  if (activeSpace) {
                    dispatch({ type: "delete-space", spaceId: activeSpace.id });
                  }
                  setDeleteConfirmOpen(false);
                }}
                type="button"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
