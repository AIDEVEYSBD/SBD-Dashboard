"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Assessment } from "@/lib/types";
import { pillVariantFor, shortStatus } from "@/lib/statuses";
import { SLA_HOURS } from "@/lib/types";
import { Pill } from "./Pill";
import { Progress } from "./Progress";
import { SortableTable, type SortableColumn } from "./SortableTable";

const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");

const RISK_RANK: Record<string, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };

// Map sortable column key → URL param `sortKey` value (server-side
// listAssessments understands the same set).
const FILTER_PARAM_BY_COL: Record<string, string> = {
  status: "statusIn",
  reviewer: "reviewerIn",
  inherentRiskCategorization: "riskIn",
};

export function AssessmentTable({ rows, kind }: { rows: Assessment[]; kind: "ICAA" | "ISA" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sla = SLA_HOURS[kind];

  // Read current sort + filter state from URL.
  const sortKey = searchParams.get("sortKey") ?? null;
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : searchParams.get("sortDir") === "desc" ? "desc" : null;
  const sort = sortKey && sortDir ? { key: sortKey, dir: sortDir as "asc" | "desc" } : null;

  const filters = useMemo<Record<string, Set<string>>>(() => {
    const out: Record<string, Set<string>> = {};
    for (const [colKey, urlKey] of Object.entries(FILTER_PARAM_BY_COL)) {
      const v = searchParams.get(urlKey);
      if (v) {
        const items = v.split(",").filter(Boolean);
        if (items.length > 0) out[colKey] = new Set(items);
      }
    }
    return out;
  }, [searchParams]);

  const pushParams = useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams);
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      // Reset pagination whenever sort or filter changes.
      sp.delete("page");
      const qs = sp.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const onSortChange = useCallback(
    (next: { key: string; dir: "asc" | "desc" } | null) => {
      pushParams({
        sortKey: next?.key ?? null,
        sortDir: next?.dir ?? null,
      });
    },
    [pushParams],
  );

  const onFiltersChange = useCallback(
    (next: Record<string, Set<string>>) => {
      const updates: Record<string, string | null> = {};
      for (const colKey of Object.keys(FILTER_PARAM_BY_COL)) {
        const urlKey = FILTER_PARAM_BY_COL[colKey]!;
        const set = next[colKey];
        updates[urlKey] = set && set.size > 0 ? [...set].join(",") : null;
      }
      pushParams(updates);
    },
    [pushParams],
  );

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
      filterable: true,
      sortValue: (r) => r.reviewer ?? "",
      filterValue: (r) => r.reviewer ?? "(unassigned)",
      render: (r) =>
        r.reviewer ? (
          <span style={{ fontSize: 13 }}>{r.reviewer}</span>
        ) : (
          <span className="muted" style={{ fontSize: 12, fontStyle: "italic" }}>unassigned</span>
        ),
    },
    {
      key: "inherentRiskCategorization",
      label: "Risk",
      filterable: true,
      sortValue: (r) => RISK_RANK[r.inherentRiskCategorization] ?? 0,
      filterValue: (r) => r.inherentRiskCategorization,
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
      filterable: true,
      sortValue: (r) => shortStatus(r.status),
      filterValue: (r) => r.status,
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
      controlledSort={sort}
      onSortChange={onSortChange}
      controlledFilters={filters}
      onFiltersChange={onFiltersChange}
    />
  );
}
