"use client";

import type { StatusRow } from "@/lib/queries";
import { Pill } from "./Pill";
import { SortableTable, type SortableColumn } from "./SortableTable";

export function StatusTable({ rows }: { rows: StatusRow[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;

  const columns: SortableColumn<StatusRow>[] = [
    {
      key: "status",
      label: "Status",
      filterable: true,
      sortValue: (r) => r.status,
      filterValue: (r) => r.status,
      render: (r) => (
        <>
          {r.status}
          {r.overdue && (
            <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>(overdue)</span>
          )}
        </>
      ),
    },
    {
      key: "short",
      label: "Pill",
      sortable: false,
      render: (r) => <Pill variant={r.variant}>{r.short}</Pill>,
    },
    {
      key: "count",
      label: "Count",
      align: "right",
      sortValue: (r) => r.count,
      render: (r) => <span className="num">{r.count.toLocaleString()}</span>,
    },
    {
      key: "pct",
      label: "%",
      align: "right",
      width: 80,
      sortValue: (r) => r.count,
      render: (r) => <span className="num muted">{((r.count / total) * 100).toFixed(1)}%</span>,
    },
  ];

  return (
    <SortableTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.status}
      defaultSort={{ key: "count", dir: "desc" }}
    />
  );
}
