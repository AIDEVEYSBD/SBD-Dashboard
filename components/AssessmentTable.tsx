import type { Assessment } from "@/lib/types";
import { pillVariantFor, shortStatus } from "@/lib/statuses";
import { SLA_HOURS } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Pill } from "./Pill";
import { Progress } from "./Progress";

const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");

export function AssessmentTable({ rows, kind }: { rows: Assessment[]; kind: "ICAA" | "ISA" }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Application</th>
          <th>Reviewer</th>
          <th>Risk</th>
          <th style={{ width: 180 }}>SBD hours / SLA</th>
          <th>Status</th>
          <th>Date sent</th>
          <th>Due</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={8} style={{ color: "var(--ink-3)", textAlign: "center", padding: "var(--s-6)" }}>
              No matches.
            </td>
          </tr>
        ) : rows.map((r) => {
          const ratio = (r.hoursForSbdToReview / SLA_HOURS[kind]) * 100;
          const variant: "ok" | "warn" | "bad" | "accent" =
            ratio > 100 ? "bad" : ratio > 80 ? "warn" : ratio > 50 ? "accent" : "ok";
          return (
            <tr key={r.id}>
              <td className="num">{r.id}</td>
              <td style={{ fontWeight: 500 }}>{r.applicationName}</td>
              <td>
                {r.reviewer ? (
                  <span className="who">
                    <Avatar code={r.reviewer} />
                  </span>
                ) : (
                  <span className="muted" style={{ fontSize: 12 }}>unassigned</span>
                )}
              </td>
              <td className="muted">{r.inherentRiskCategorization}</td>
              <td>
                <Progress value={Math.min(150, ratio)} variant={variant} showNum={false} />
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                  {r.hoursForSbdToReview.toFixed(1)}h / {SLA_HOURS[kind]}h
                </div>
              </td>
              <td><Pill variant={pillVariantFor(r.status)}>{shortStatus(r.status)}</Pill></td>
              <td className="muted mono">{fmtDate(r.dateSent)}</td>
              <td className="muted mono">{fmtDate(r.dateDue)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
