import type { KpiTile } from "@/lib/types";
import { Spark } from "./Spark";

const ARROW = {
  up: (
    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M5 8V2m0 0L2 5m3-3 3 3" />
    </svg>
  ),
  down: (
    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M5 2v6m0 0L2 5m3 3 3-3" />
    </svg>
  ),
  flat: (
    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M2 5h6" />
    </svg>
  ),
};

export function KpiCard({ tile, chartVariant = "area" }: { tile: KpiTile; chartVariant?: "line" | "area" | "bar" }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{tile.label}</div>
      <div className="kpi-value tnum">
        {tile.value}
        {tile.unit && <span className="unit">{tile.unit}</span>}
      </div>
      <Spark data={tile.spark} color={tile.color} variant={chartVariant} />
      <div className="kpi-foot">
        {tile.delta && (
          <span className={`kpi-delta ${tile.dir ?? "flat"}`}>
            {tile.dir ? ARROW[tile.dir] : null}{tile.delta}
          </span>
        )}
        {tile.note && <span>{tile.note}</span>}
      </div>
    </div>
  );
}

export function KpiStrip({ tiles, chartVariant }: { tiles: KpiTile[]; chartVariant?: "line" | "area" | "bar" }) {
  const cls =
    tiles.length === 4 ? "grid-4"
    : tiles.length === 6 ? "grid-6"
    : "grid-5";
  return (
    <div className={cls}>
      {tiles.map((t) => <KpiCard key={t.label} tile={t} chartVariant={chartVariant} />)}
    </div>
  );
}
