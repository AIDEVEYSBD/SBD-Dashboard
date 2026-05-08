"use client";

import { useState, type ReactNode } from "react";

export interface SortableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean;          // default true
  width?: number;
  // The value used for sorting; if omitted we use row[key].
  sortValue?: (row: T) => string | number | Date | null | undefined;
  // Custom cell renderer.
  render?: (row: T) => ReactNode;
}

export interface SortableTableProps<T> {
  rows: T[];
  columns: SortableColumn<T>[];
  defaultSort?: { key: string; dir: "asc" | "desc" };
  rowKey: (row: T) => string;
  emptyMessage?: string;
  // Optional row click handler.
  onRowClick?: (row: T) => void;
}

type SortDir = "asc" | "desc";

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;        // nulls last
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function SortableTable<T>({
  rows,
  columns,
  defaultSort,
  rowKey,
  emptyMessage,
  onRowClick,
}: SortableTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(defaultSort ?? null);

  let display = rows;
  if (sort) {
    const col = columns.find((c) => c.key === sort.key);
    if (col) {
      const get = col.sortValue ?? ((r: T) => (r as Record<string, unknown>)[col.key]);
      display = [...rows].sort((a, b) => {
        const cmp = compare(get(a), get(b));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
  }

  function cycle(key: string) {
    if (!sort || sort.key !== key) {
      setSort({ key, dir: "desc" });
    } else if (sort.dir === "desc") {
      setSort({ key, dir: "asc" });
    } else {
      setSort(null);
    }
  }

  return (
    <table className="table sortable">
      <thead>
        <tr>
          {columns.map((col) => {
            const sortable = col.sortable !== false;
            const active = sort?.key === col.key;
            const indicator = !sortable
              ? null
              : active
                ? sort!.dir === "asc"
                  ? "↑"
                  : "↓"
                : "↕";
            return (
              <th
                key={col.key}
                style={{
                  textAlign: col.align ?? "left",
                  width: col.width,
                  cursor: sortable ? "pointer" : "default",
                  userSelect: "none",
                }}
                onClick={sortable ? () => cycle(col.key) : undefined}
                aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: col.align === "right" ? "flex-end" : "flex-start", width: "100%" }}>
                  {col.label}
                  {indicator && (
                    <span className={`sort-indicator${active ? " active" : ""}`}>{indicator}</span>
                  )}
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {display.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ textAlign: "center", color: "var(--ink-3)", padding: "var(--s-6)" }}>
              {emptyMessage ?? "No data."}
            </td>
          </tr>
        ) : (
          display.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: "pointer" } : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align ?? "left" }}>
                  {col.render
                    ? col.render(row)
                    : ((row as Record<string, unknown>)[col.key] as ReactNode) ?? null}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
