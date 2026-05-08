export function Progress({
  value,
  variant = "accent",
  showNum = true,
}: {
  value: number;
  variant?: "ok" | "warn" | "bad" | "accent" | "default";
  showNum?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const cls = variant === "default" ? "" : variant;
  return (
    <div className="progress">
      <div className="progress-bar">
        <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      {showNum && <span className="progress-num">{Math.round(pct)}%</span>}
    </div>
  );
}
