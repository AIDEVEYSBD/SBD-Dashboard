export function Ring({
  value,
  size = 120,
  thickness = 6,
  color,
  label,
  showPercent = true,
}: {
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  label?: string;
  showPercent?: boolean;
}) {
  const r = size / 2 - thickness;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  const stroke = color ?? "var(--accent)";
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="butt"
        />
      </svg>
      <div className="ring-center">
        <div>
          <div className="v">
            {Math.round(value)}
            {showPercent && <span style={{ fontSize: 14, color: "var(--ink-3)" }}>%</span>}
          </div>
          {label && <div className="l">{label}</div>}
        </div>
      </div>
    </div>
  );
}
