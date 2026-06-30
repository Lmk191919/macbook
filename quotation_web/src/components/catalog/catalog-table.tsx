"use client";

import { useMemo, useState } from "react";

import { DEFAULT_SPACE_NAMES } from "@/domain/catalog";
import { formatCents } from "@/lib/money";
import type { CatalogItemRecord } from "@/server/repositories/quotation-repository";

type CatalogTableProps = Readonly<{
  items: readonly CatalogItemRecord[];
  onEditItem?: (itemId: string) => void;
  onToggleItem?: (itemId: string, active: boolean) => void | Promise<void>;
}>;

function matchesQuery(item: CatalogItemRecord, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [item.name, item.unit, item.description ?? "", item.notes ?? "", ...item.spaces]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function CatalogTable({ items, onEditItem, onToggleItem }: CatalogTableProps) {
  const [query, setQuery] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("全部");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (spaceFilter !== "全部" && !item.spaces.includes(spaceFilter)) {
        return false;
      }

      return matchesQuery(item, query);
    });
  }, [items, query, spaceFilter]);

  return (
    <section className="card stack">
      <div className="toolbar">
        <label className="field field--search" htmlFor="catalog-search">
          <span>搜索项目</span>
          <input
            className="input focus-ring"
            id="catalog-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="项目名、说明、空间"
            type="search"
          />
        </label>

        <label className="field" htmlFor="space-filter">
          <span>按空间筛选</span>
          <select
            className="input focus-ring"
            id="space-filter"
            value={spaceFilter}
            onChange={(event) => setSpaceFilter(event.target.value)}
          >
            <option value="全部">全部</option>
            {DEFAULT_SPACE_NAMES.map((space) => (
              <option key={space} value={space}>
                {space}
              </option>
            ))}
            {Array.from(new Set(items.flatMap((item) => item.spaces)))
              .filter((space) => !DEFAULT_SPACE_NAMES.includes(space as (typeof DEFAULT_SPACE_NAMES)[number]))
              .map((space) => (
                <option key={space} value={space}>
                  {space}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>项目名称</th>
              <th>适用空间</th>
              <th>单位</th>
              <th>计价方式</th>
              <th>默认单价</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.name}</strong>
                  {item.description ? <div className="muted">{item.description}</div> : null}
                </td>
                <td>{item.spaces.join("、")}</td>
                <td>{item.unit}</td>
                <td>{item.pricingMode === "combined" ? "综合价" : "拆分价"}</td>
                <td>
                  {item.pricingMode === "combined"
                    ? formatCents(item.combinedUnitPrice)
                    : `${formatCents(item.laborUnitPrice)} + ${formatCents(item.materialUnitPrice)}`}
                </td>
                <td>
                  <span className={`badge ${item.active ? "badge--success" : "badge--muted"}`}>
                    {item.active ? "启用中" : "已停用"}
                  </span>
                </td>
                <td className="actions">
                  {onEditItem ? (
                    <button className="text-button focus-ring" onClick={() => onEditItem(item.id)} type="button">
                      编辑
                    </button>
                  ) : null}
                  {onToggleItem ? (
                    <button
                      className="text-button focus-ring"
                      onClick={() => onToggleItem(item.id, !item.active)}
                      type="button"
                    >
                      {item.active ? "停用" : "启用"}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  没有找到匹配的项目。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
