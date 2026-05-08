"use client";

import { useId } from "react";

export function Spark({
  data,
  color,
  variant = "area",
}: {
  data: number[];
  color?: string;
  variant?: "line" | "area" | "bar";
}) {
  const id = useId();
  const w = 180, h = 36, pad = 2;
  const max = Math.max(1, ...data) * 1.1;
  const xs = (i: number) => (i * (w - pad * 2)) / Math.max(1, data.length - 1) + pad;
  const ys = (v: number) => h - (v / max) * (h - pad * 2) - pad;
  const linePath = data.map((v, i) => `${i === 0 ? "M" : "L"}${xs(i)},${ys(v)}`).join(" ");
  const areaPath = `${linePath} L${xs(data.length - 1)},${h} L${xs(0)},${h} Z`;
  const c = color ?? "var(--accent)";

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      {variant === "bar" ? (
        data.map((v, i) => {
          const bw = (w - pad * 2) / data.length - 1.5;
          const x = pad + i * ((w - pad * 2) / data.length);
          const y = ys(v);
          return <rect key={i} x={x} y={y} width={bw} height={h - y - pad} fill={c} rx={1} />;
        })
      ) : variant === "line" ? (
        <path d={linePath} fill="none" stroke={c} strokeWidth={1.25} />
      ) : (
        <>
          <defs>
            <linearGradient id={`sp${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={0.3} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#sp${id})`} />
          <path d={linePath} fill="none" stroke={c} strokeWidth={1.25} />
        </>
      )}
    </svg>
  );
}
