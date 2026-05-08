import type { BreakdownSegment } from "@/lib/types";

export function StackBar({ segments }: { segments: BreakdownSegment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;
  return (
    <>
      <div className="stack-bar">
        {segments.map((s) => (
          <div
            key={s.label}
            title={`${s.label}: ${s.value.toLocaleString()}`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          />
        ))}
      </div>
      <div className="stack-legend">
        {segments.map((s) => (
          <span key={s.label}>
            <span className="swatch" style={{ background: s.color }} />
            <span className="stack-label">{s.label}</span>
            <span className="stack-value">{s.value.toLocaleString()}</span>
          </span>
        ))}
      </div>
    </>
  );
}
