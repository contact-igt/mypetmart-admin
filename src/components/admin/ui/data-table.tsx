"use client";

import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  className?: string;
};

function SortIcon({ direction }: { direction: "asc" | "desc" | null }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={12}
      height={12}
      aria-hidden="true"
      className={`transition-transform duration-150 ease-out ${direction === "desc" ? "rotate-180" : ""} ${
        direction ? "opacity-100" : "opacity-30"
      }`}
    >
      <path d="M12 5l6 8H6l6-8Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Generic sortable, optionally-selectable table. Scrolls horizontally
 * inside its own wrapper on narrow viewports — the page itself never
 * overflows.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  sortBy,
  sortDir = "asc",
  onSort,
  selectedIds,
  onSelectionChange,
  onRowClick,
  tableClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onRowClick?: (row: T) => void;
  tableClassName?: string;
}) {
  const selectable = Boolean(selectedIds && onSelectionChange);
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedIds!.has(getRowId(r)));

  function toggleAll() {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(rows.map(getRowId)));
    }
  }

  function toggleRow(id: string) {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-white">
      <table className={`w-full min-w-[640px] border-collapse text-sm ${tableClassName ?? ""}`}>
        <thead>
          <tr className="border-b border-border-subtle bg-cream-bg/60 text-left text-xs font-semibold uppercase tracking-wide text-text-primary/60">
            {selectable && (
              <th className="w-12 px-4 py-3 text-center align-middle">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                  className="h-4 w-4 accent-primary-orange"
                />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSort?.(col.key)}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-text-primary/60 transition-colors duration-150 ease-out hover:text-text-primary"
                  >
                    {col.header}
                    <SortIcon direction={sortBy === col.key ? sortDir : null} />
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = getRowId(row);
            return (
              <tr
                key={id}
                className={`border-b border-border-subtle/70 transition-colors last:border-b-0 hover:bg-cream-bg/30 ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <td className="w-12 px-4 py-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds!.has(id)}
                      onChange={() => toggleRow(id)}
                      aria-label={`Select row ${id}`}
                      className="h-4 w-4 accent-primary-orange"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 align-middle text-text-primary ${col.className ?? ""}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
