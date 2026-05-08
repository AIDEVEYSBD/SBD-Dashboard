"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface ChartPoint { label: string; value: number }

const PADDING = { t: 16, r: 16, b: 28, l: 40 };

export function Chart({
  data,
  variant = "line",
  height = 200,
  color,
  yMax,
  gridY = 4,
}: {
  data: ChartPoint[];
  variant?: "line" | "area" | "bar";
  height?: number;
  color?: string;
  yMax?: number;
  gridY?: number;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e!.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const innerW = w - PADDING.l - PADDING.r;
  const innerH = height - PADDING.t - PADDING.b;
  const ymax = yMax ?? Math.max(1, ...data.map((d) => d.value)) * 1.15;
  const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const stroke = color ?? "var(--accent)";

  const pts = data.map((d, i) => ({
    x: PADDING.l + i * xStep,
    y: PADDING.t + innerH - (d.value / ymax) * innerH,
    raw: d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = pts.length > 0
    ? `${linePath} L${pts[pts.length - 1]!.x.toFixed(1)},${(PADDING.t + innerH).toFixed(1)} L${pts[0]!.x.toFixed(1)},${(PADDING.t + innerH).toFixed(1)} Z`
    : "";

  const yTicks = Array.from({ length: gridY + 1 }, (_, i) => i * (ymax / gridY));
  const labelStride = Math.max(1, Math.ceil(data.length / 8));

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current || data.length === 0) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = x - PADDING.l;
    if (relativeX < -xStep / 2 || relativeX > innerW + xStep / 2) {
      setHover(null);
      return;
    }
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(relativeX / xStep)));
    setHover(idx);
  }

  const activePt = hover !== null ? pts[hover] : null;
  // Keep tooltip inside chart bounds — clamp horizontal position.
  const tooltipLeft = activePt
    ? Math.min(Math.max(activePt.x, 60), w - 60)
    : 0;
  const tooltipTop = activePt ? Math.max(activePt.y - 14, 8) : 0;

  return (
    <div
      ref={ref}
      style={{ width: "100%", position: "relative" }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg width={w} height={height} style={{ display: "block", overflow: "visible" }}>
        {yTicks.map((t, i) => {
          const y = PADDING.t + innerH - (t / ymax) * innerH;
          return (
            <g key={i}>
              <line x1={PADDING.l} x2={w - PADDING.r} y1={y} y2={y} stroke="var(--line)" strokeDasharray={i === 0 ? undefined : "2 3"} />
              <text x={PADDING.l - 8} y={y + 3} textAnchor="end" fontFamily="var(--font-mono)" fontSize={10} fill="var(--ink-4)">
                {Math.round(t).toLocaleString()}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          if (i % labelStride !== 0 && i !== data.length - 1) return null;
          const x = PADDING.l + i * xStep;
          return (
            <text
              key={i}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={10}
              fill="var(--ink-4)"
              style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}
            >
              {d.label}
            </text>
          );
        })}

        {variant === "area" && (
          <>
            <defs>
              <linearGradient id={`gr${id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#gr${id})`} />
            <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {variant === "line" && (
          <>
            <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2} fill="var(--bg)" stroke={stroke} strokeWidth={1.25} />
            ))}
          </>
        )}

        {variant === "bar" && pts.map((p, i) => {
          const bw = Math.max(4, xStep * 0.55);
          const isHover = hover === i;
          return (
            <rect
              key={i}
              x={p.x - bw / 2}
              y={p.y}
              width={bw}
              height={PADDING.t + innerH - p.y}
              fill={stroke}
              opacity={hover !== null && !isHover ? 0.55 : 1}
              rx={2}
            />
          );
        })}

        {/* Hover guides */}
        {activePt && (
          <g style={{ pointerEvents: "none" }}>
            <line
              x1={activePt.x}
              x2={activePt.x}
              y1={PADDING.t}
              y2={PADDING.t + innerH}
              stroke="var(--ink-3)"
              strokeDasharray="2 3"
              opacity={0.5}
            />
            {variant !== "bar" && (
              <circle
                cx={activePt.x}
                cy={activePt.y}
                r={4}
                fill="var(--surface-solid)"
                stroke={stroke}
                strokeWidth={2}
              />
            )}
          </g>
        )}
      </svg>

      {activePt && hover !== null && (
        <div className="chart-tooltip" style={{ left: tooltipLeft, top: tooltipTop }}>
          <span className="label">{data[hover]!.label}</span>
          <span className="value">{data[hover]!.value.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// Stacked bar — multi-series. Used for monthly volume (sent/completed/rejected/withdrawn).
export interface StackedSeries { label: string; values: number[]; color: string }

export function StackedBarChart({
  labels,
  series,
  height = 200,
}: {
  labels: string[];
  series: StackedSeries[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e!.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const innerW = w - PADDING.l - PADDING.r;
  const innerH = height - PADDING.t - PADDING.b;
  const totals = labels.map((_, i) => series.reduce((s, sr) => s + (sr.values[i] ?? 0), 0));
  const ymax = Math.max(1, ...totals) * 1.15;
  const xStep = labels.length > 0 ? innerW / labels.length : innerW;
  const bw = Math.max(6, xStep * 0.6);
  const yTicks = Array.from({ length: 5 }, (_, i) => i * (ymax / 4));

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current || labels.length === 0) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = x - PADDING.l;
    if (relativeX < 0 || relativeX > innerW) {
      setHover(null);
      return;
    }
    const idx = Math.max(0, Math.min(labels.length - 1, Math.floor(relativeX / xStep)));
    setHover(idx);
  }

  const activeX = hover !== null ? PADDING.l + hover * xStep + xStep / 2 : 0;
  const tooltipLeft = hover !== null ? Math.min(Math.max(activeX, 100), w - 100) : 0;

  return (
    <div
      ref={ref}
      style={{ width: "100%", position: "relative" }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg width={w} height={height} style={{ display: "block", overflow: "visible" }}>
        {yTicks.map((t, i) => {
          const y = PADDING.t + innerH - (t / ymax) * innerH;
          return (
            <g key={i}>
              <line x1={PADDING.l} x2={w - PADDING.r} y1={y} y2={y} stroke="var(--line)" strokeDasharray={i === 0 ? undefined : "2 3"} />
              <text x={PADDING.l - 8} y={y + 3} textAnchor="end" fontFamily="var(--font-mono)" fontSize={10} fill="var(--ink-4)">
                {Math.round(t).toLocaleString()}
              </text>
            </g>
          );
        })}

        {labels.map((lbl, i) => {
          let yCursor = PADDING.t + innerH;
          const x = PADDING.l + i * xStep + xStep / 2;
          const isHover = hover === i;
          return (
            <g key={i}>
              {series.map((sr) => {
                const v = sr.values[i] ?? 0;
                const h = (v / ymax) * innerH;
                yCursor -= h;
                return (
                  <rect
                    key={sr.label}
                    x={x - bw / 2}
                    y={yCursor}
                    width={bw}
                    height={h}
                    fill={sr.color}
                    opacity={hover !== null && !isHover ? 0.5 : 1}
                  />
                );
              })}
              <text x={x} y={height - 8} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={10} fill={isHover ? "var(--ink)" : "var(--ink-4)"} style={{ letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {lbl}
              </text>
            </g>
          );
        })}
      </svg>

      {hover !== null && (
        <div className="chart-tooltip multi" style={{ left: tooltipLeft, top: PADDING.t }}>
          <span className="label">{labels[hover]}</span>
          {series.map((sr) => (
            <span className="row" key={sr.label}>
              <span className="dot" style={{ background: sr.color }} />
              <span className="series">{sr.label}</span>
              <span className="value">{(sr.values[hover!] ?? 0).toLocaleString()}</span>
            </span>
          ))}
          <span className="row total">
            <span className="series">Total</span>
            <span className="value">{(totals[hover!] ?? 0).toLocaleString()}</span>
          </span>
        </div>
      )}

      <div className="stack-legend" style={{ marginTop: 8 }}>
        {series.map((sr) => (
          <span key={sr.label}>
            <span className="swatch" style={{ background: sr.color }} />
            <span className="stack-label">{sr.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
