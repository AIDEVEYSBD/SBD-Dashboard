"use client";

import { SortableTable, type SortableColumn } from "./SortableTable";

interface Row { cat: string; completed: number; converted: number; pct: number }

const RISK_RANK: Record<string, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };

export function ConversionByRiskTable({ rows }: { rows: Row[] }) {
  const columns: SortableColumn<Row>[] = [
    {
      key: "cat",
      label: "Risk category",
      sortValue: (r) => RISK_RANK[r.cat] ?? 0,
    },
    {
      key: "completed",
      label: "Completed",
      align: "right",
      sortValue: (r) => r.completed,
      render: (r) => <span className="num">{r.completed.toLocaleString()}</span>,
    },
    {
      key: "converted",
      label: "Converted",
      align: "right",
      sortValue: (r) => r.converted,
      render: (r) => <span className="num">{r.converted.toLocaleString()}</span>,
    },
    {
      key: "pct",
      label: "Rate",
      align: "right",
      sortValue: (r) => r.pct,
      render: (r) => (
        <span
          className="num"
          style={{ color: r.pct >= 50 ? "var(--accent)" : "var(--ink-2)" }}
        >
          {r.pct}%
        </span>
      ),
    },
  ];

  return (
    <SortableTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.cat}
      defaultSort={{ key: "cat", dir: "asc" }}
    />
  );
}
