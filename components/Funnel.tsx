import type { FunnelStep } from "@/lib/types";

export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {steps.map((s, i) => {
        const ratio = s.value / max;
        const prev = i > 0 ? steps[i - 1]!.value : s.value;
        const dropPct = prev > 0 ? ((prev - s.value) / prev) * 100 : 0;
        const isFinal = i === steps.length - 1;
        return (
          <div key={s.label} style={{ display: "grid", gridTemplateColumns: "200px 1fr 80px 70px", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: isFinal ? "var(--accent)" : "var(--ink-2)", fontWeight: isFinal ? 500 : 400 }}>
              {s.label}
            </span>
            <div style={{ height: 22, background: "var(--bg-2)", borderRadius: 4, position: "relative", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${ratio * 100}%`,
                background: isFinal ? "var(--accent)" : "var(--ink-3)",
                borderRadius: 4,
                transition: "width 200ms ease",
              }} />
            </div>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)", textAlign: "right" }}>
              {s.value.toLocaleString()}
            </span>
            <span className="mono" style={{ fontSize: 11, color: i === 0 ? "var(--ink-4)" : dropPct > 0 ? "var(--bad)" : "var(--ink-3)", textAlign: "right" }}>
              {i === 0 ? "" : `−${dropPct.toFixed(0)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
