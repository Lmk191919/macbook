"use client";

import { useMemo, useState } from "react";

import type { CatalogItemRecord } from "@/server/repositories/quotation-repository";

type CatalogPickerProps = Readonly<{
  open: boolean;
  currentSpaceName: string;
  items: readonly CatalogItemRecord[];
  onClose: () => void;
  onAddItems: (items: CatalogItemRecord[]) => void;
}>;

export function CatalogPicker({ open, currentSpaceName, items, onClose, onAddItems }: CatalogPickerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visibleItems = useMemo(
    () => items.filter((item) => item.active && item.spaces.includes(currentSpaceName)),
    [currentSpaceName, items],
  );

  if (!open) {
    return null;
  }

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  return (
    <div aria-label="项目库选择" className="dialog-backdrop" role="dialog">
      <div className="dialog-card stack">
        <h2>项目库选择</h2>
        <div className="catalog-picker-list">
          {visibleItems.map((item) => (
            <label key={item.id} className="catalog-picker-item">
              <input
                checked={selectedIds.includes(item.id)}
                onChange={() => toggle(item.id)}
                type="checkbox"
                aria-label={item.name}
              />
              <span>{item.name}</span>
            </label>
          ))}
        </div>
        <div className="dialog-actions">
          <button className="button button--ghost focus-ring" onClick={onClose} type="button">
            取消
          </button>
          <button
            className="button focus-ring"
            onClick={() => {
              onAddItems(visibleItems.filter((item) => selectedIds.includes(item.id)));
              setSelectedIds([]);
            }}
            type="button"
          >
            添加所选项目
          </button>
        </div>
      </div>
    </div>
  );
}
