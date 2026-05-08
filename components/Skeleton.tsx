import type { CSSProperties } from "react";

export function Skeleton({
  height = 16,
  width = "100%",
  radius = 6,
  style,
}: {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      className="skeleton"
      style={{ height, width, borderRadius: radius, ...style }}
      aria-hidden
    />
  );
}

// A KPI-shaped placeholder. Matches the real .kpi dimensions to avoid CLS.
export function SkeletonKpi() {
  return (
    <div className="skeleton-card">
      <Skeleton height={11} width={120} />
      <Skeleton height={36} width={110} />
      <Skeleton height={36} width="100%" />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto" }}>
        <Skeleton height={11} width={50} />
        <Skeleton height={11} width={80} />
      </div>
    </div>
  );
}

export function SkeletonCard({ height = 220, title = true }: { height?: number; title?: boolean }) {
  return (
    <section className="card">
      {title && (
        <div className="card-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton height={14} width={200} />
            <Skeleton height={11} width={260} />
          </div>
        </div>
      )}
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Skeleton height={height - 40} width="100%" radius={8} />
      </div>
    </section>
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="row-list">
      {Array.from({ length: rows }, (_, i) => (
        <div className="row" key={i}>
          <Skeleton height={11} width={80} />
          <Skeleton height={13} width="60%" />
          <Skeleton height={20} width={80} radius={999} />
          <Skeleton height={11} width={70} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonHeader({ wide = false }: { wide?: boolean }) {
  return (
    <div className="section-head">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Skeleton height={11} width={140} />
        <Skeleton height={28} width={wide ? 380 : 280} />
        <Skeleton height={13} width={wide ? 480 : 360} />
      </div>
    </div>
  );
}
