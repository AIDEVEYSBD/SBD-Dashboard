"use client";

import type { Assessment } from "@/lib/types";
import { pillVariantFor, shortStatus } from "@/lib/statuses";
import { SLA_HOURS } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Pill } from "./Pill";
import { Progress } from "./Progress";
import { SortableTable, type SortableColumn } from "./SortableTable";

const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");

const RISK_RANK: Record<string, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };

export function AssessmentTable({ rows, kind }: { rows: Assessment[]; kind: "ICAA" | "ISA" }) {
  const sla = SLA_HOURS[kind];

  const columns: SortableColumn<Assessment>[] = [
    {
      key: "id",
      label: "ID",
      sortValue: (r) => r.id,
      render: (r) => <span className="num">{r.id}</span>,
    },
    {
      key: "applicationName",
      label: "Application",
      sortValue: (r) => r.applicationName,
      render: (r) => <span style={{ fontWeight: 500 }}>{r.applicationName}</span>,
    },
    {
      key: "reviewer",
      label: "Reviewer",
      sortValue: (r) => r.reviewer ?? "",
      render: (r) =>
        r.reviewer ? (
          <span className="who">
            <Avatar code={r.reviewer} />
          </span>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>unassigned</span>
        ),
    },
    {
      key: "inherentRiskCategorization",
      label: "Risk",
      sortValue: (r) => RISK_RANK[r.inherentRiskCategorization] ?? 0,
      render: (r) => <span className="muted">{r.inherentRiskCategorization}</span>,
    },
    {
      key: "hoursForSbdToReview",
      label: "SBD hours / SLA",
      width: 180,
      sortValue: (r) => r.hoursForSbdToReview / sla,
      render: (r) => {
        const ratio = (r.hoursForSbdToReview / sla) * 100;
        const variant: "ok" | "warn" | "bad" | "accent" =
          ratio > 100 ? "bad" : ratio > 80 ? "warn" : ratio > 50 ? "accent" : "ok";
        return (
          <>
            <Progress value={Math.min(150, ratio)} variant={variant} showNum={false} />
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
              {r.hoursForSbdToReview.toFixed(1)}h / {sla}h
            </div>
          </>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortValue: (r) => shortStatus(r.status),
      render: (r) => <Pill variant={pillVariantFor(r.status)}>{shortStatus(r.status)}</Pill>,
    },
    {
      key: "dateSent",
      label: "Date sent",
      sortValue: (r) => r.dateSent,
      render: (r) => <span className="muted mono">{fmtDate(r.dateSent)}</span>,
    },
    {
      key: "dateDue",
      label: "Due",
      sortValue: (r) => r.dateDue,
      render: (r) => <span className="muted mono">{fmtDate(r.dateDue)}</span>,
    },
  ];

  return (
    <SortableTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      emptyMessage="No matches."
    />
  );
}
