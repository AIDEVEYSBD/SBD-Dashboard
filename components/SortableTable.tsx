"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface SortableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  sortValue?: (row: T) => string | number | Date | null | undefined;
  filterValue?: (row: T) => string | number | null | undefined;
  render?: (row: T) => ReactNode;
}

export interface SortableTableProps<T> {
  rows: T[];
  columns: SortableColumn<T>[];
  defaultSort?: { key: string; dir: "asc" | "desc" };
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  // Controlled mode — when these are passed, the table reflects external state
  // (e.g. driven by URL params for server-side sort + filter).
  controlledSort?: { key: string; dir: "asc" | "desc" } | null;
  onSortChange?: (sort: { key: string; dir: "asc" | "desc" } | null) => void;
  controlledFilters?: Record<string, Set<string>>;
  onFiltersChange?: (filters: Record<string, Set<string>>) => void;
}

type SortDir = "asc" | "desc";

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

const FILTER_ICON = (
  <svg viewBox="0 0 14 14" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h10l-3.5 4.5V11l-3 1.5V7.5L2 3z" />
  </svg>
);

interface FilterButtonProps {
  open: boolean;
  active: boolean;
  onToggle: () => void;
  onClose: () => void;
  label: string;
  values: string[];
  selected: Set<string>;
  onItem: (v: string) => void;
  onClear: () => void;
  onSelectAll: () => void;
}

function FilterButton({
  open,
  active,
  onToggle,
  onClose,
  label,
  values,
  selected,
  onItem,
  onClear,
  onSelectAll,
}: FilterButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const filtered = search.trim()
    ? values.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
    : values;

  return (
    <div className="filter-wrap" ref={ref}>
      <button
        type="button"
        className={`filter-btn${active ? " active" : ""}`}
        onClick={onToggle}
        aria-label={`Filter ${label}`}
        aria-expanded={open}
      >
        {FILTER_ICON}
        {active && <span className="filter-dot" />}
      </button>
      {open && (
        <div className="filter-popover" onClick={(e) => e.stopPropagation()}>
          <div className="filter-popover-head">
            <span className="eyebrow">Filter {label}</span>
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-search"
              autoFocus
            />
          </div>
          <div className="filter-popover-list">
            {filtered.length === 0 ? (
              <div className="filter-empty">No matches.</div>
            ) : (
              filtered.map((v) => (
                <label key={v} className="filter-item">
                  <input type="checkbox" checked={selected.has(v)} onChange={() => onItem(v)} />
                  <span className="filter-item-label">{v}</span>
                </label>
              ))
            )}
          </div>
          <div className="filter-popover-foot">
            <button type="button" className="filter-link" onClick={onSelectAll}>
              Select all
            </button>
            <button type="button" className="filter-link" onClick={onClear}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SortableTable<T>({
  rows,
  columns,
  defaultSort,
  rowKey,
  emptyMessage,
  onRowClick,
  controlledSort,
  onSortChange,
  controlledFilters,
  onFiltersChange,
}: SortableTableProps<T>) {
  const [internalSort, setInternalSort] = useState<{ key: string; dir: SortDir } | null>(defaultSort ?? null);
  const [internalFilters, setInternalFilters] = useState<Record<string, Set<string>>>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const sort = controlledSort !== undefined ? controlledSort : internalSort;
  const filters = controlledFilters !== undefined ? controlledFilters : internalFilters;

  const updateSort = (next: { key: string; dir: SortDir } | null) => {
    if (onSortChange) onSortChange(next);
    else setInternalSort(next);
  };
  const updateFilters = (
    updater: (prev: Record<string, Set<string>>) => Record<string, Set<string>>,
  ) => {
    const next = updater(filters);
    if (onFiltersChange) onFiltersChange(next);
    else setInternalFilters(next);
  };

  const distinctValues = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const col of columns) {
      if (!col.filterable) continue;
      const get =
        col.filterValue ??
        col.sortValue ??
        ((r: T) => (r as Record<string, unknown>)[col.key] as string);
      const vals = new Set<string>();
      for (const row of rows) {
        const v = get(row);
        if (v == null || v === "") continue;
        vals.add(String(v));
      }
      out[col.key] = [...vals].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
      );
    }
    return out;
  }, [rows, columns]);

  let display = rows;
  const activeFilterKeys = Object.keys(filters).filter((k) => filters[k] && filters[k]!.size > 0);
  if (activeFilterKeys.length > 0) {
    display = display.filter((row) => {
      for (const key of activeFilterKeys) {
        const col = columns.find((c) => c.key === key);
        if (!col) continue;
        const get =
          col.filterValue ??
          col.sortValue ??
          ((r: T) => (r as Record<string, unknown>)[col.key] as string);
        const v = get(row);
        if (!filters[key]!.has(String(v ?? ""))) return false;
      }
      return true;
    });
  }

  if (sort) {
    const col = columns.find((c) => c.key === sort.key);
    if (col) {
      const get = col.sortValue ?? ((r: T) => (r as Record<string, unknown>)[col.key]);
      display = [...display].sort((a, b) => {
        const cmp = compare(get(a), get(b));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
  }

  function cycleSort(key: string) {
    if (!sort || sort.key !== key) {
      updateSort({ key, dir: "desc" });
    } else if (sort.dir === "desc") {
      updateSort({ key, dir: "asc" });
    } else {
      updateSort(null);
    }
  }

  function toggleFilterValue(key: string, value: string) {
    updateFilters((f) => {
      const next = { ...f };
      const cur = new Set(next[key] ?? []);
      if (cur.has(value)) cur.delete(value);
      else cur.add(value);
      next[key] = cur;
      return next;
    });
  }

  function clearFilter(key: string) {
    updateFilters((f) => {
      const next = { ...f };
      delete next[key];
      return next;
    });
  }

  function selectAll(key: string) {
    const all = distinctValues[key] ?? [];
    updateFilters((f) => ({ ...f, [key]: new Set(all) }));
  }

  return (
    <table className="table sortable">
      <thead>
        <tr>
          {columns.map((col) => {
            const sortable = col.sortable !== false;
            const active = sort?.key === col.key;
            const filterActive = (filters[col.key]?.size ?? 0) > 0;
            return (
              <th
                key={col.key}
                style={{
                  textAlign: col.align ?? "left",
                  width: col.width,
                  position: "relative",
                }}
                aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : "none"}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    justifyContent: col.align === "right" ? "flex-end" : "flex-start",
                    width: "100%",
                  }}
                >
                  <span
                    onClick={sortable ? () => cycleSort(col.key) : undefined}
                    style={{
                      cursor: sortable ? "pointer" : "default",
                      userSelect: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {col.label}
                    {sortable && (
                      <span className={`sort-indicator${active ? " active" : ""}`}>
                        {active ? (sort!.dir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    )}
                  </span>
                  {col.filterable && (
                    <FilterButton
                      open={openFilter === col.key}
                      active={filterActive}
                      onToggle={() => setOpenFilter((cur) => (cur === col.key ? null : col.key))}
                      onClose={() => setOpenFilter(null)}
                      label={col.label}
                      values={distinctValues[col.key] ?? []}
                      selected={filters[col.key] ?? new Set()}
                      onItem={(v) => toggleFilterValue(col.key, v)}
                      onClear={() => clearFilter(col.key)}
                      onSelectAll={() => selectAll(col.key)}
                    />
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
