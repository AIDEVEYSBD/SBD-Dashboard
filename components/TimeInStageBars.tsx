import type { TimeInStageRow } from "@/lib/queries";

export function TimeInStageBars({ rows }: { rows: TimeInStageRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.hours));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r) => (
        <div key={r.stage} style={{ display: "grid", gridTemplateColumns: "180px 1fr 60px", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{r.stage}</span>
          <div style={{ height: 8, background: "var(--bg-3)", borderRadius: 999 }}>
            <div style={{ height: "100%", width: `${(r.hours / max) * 100}%`, background: r.color, borderRadius: 999 }} />
          </div>
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)", textAlign: "right" }}>
            {r.hours.toFixed(1)}h
          </span>
        </div>
      ))}
    </div>
  );
}
