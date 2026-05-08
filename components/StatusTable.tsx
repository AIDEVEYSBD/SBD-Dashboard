import type { StatusRow } from "@/lib/queries";
import { Pill } from "./Pill";

export function StatusTable({ rows }: { rows: StatusRow[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Status</th>
          <th>Pill</th>
          <th style={{ textAlign: "right" }}>Count</th>
          <th style={{ textAlign: "right", width: 80 }}>%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.status}>
            <td>{r.status}{r.overdue && <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>(overdue)</span>}</td>
            <td><Pill variant={r.variant}>{r.short}</Pill></td>
            <td className="num" style={{ textAlign: "right" }}>{r.count.toLocaleString()}</td>
            <td className="num muted" style={{ textAlign: "right" }}>{((r.count / total) * 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
