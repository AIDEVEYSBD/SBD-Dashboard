import type { WatchlistItem } from "@/lib/types";
import { Pill } from "./Pill";

export function Watchlist({ items, emptyMessage = "Nothing matches today." }: { items: WatchlistItem[]; emptyMessage?: string }) {
  if (items.length === 0) {
    return <p style={{ color: "var(--ink-3)", fontSize: 13, padding: "8px 0" }}>{emptyMessage}</p>;
  }
  return (
    <div className="row-list">
      {items.map((it) => (
        <div className="row" key={it.id}>
          <span className="id">{it.id}</span>
          <span className="name">{it.application}</span>
          <Pill variant={it.pillVariant}>{it.status}</Pill>
          <span className="meta">{it.meta}</span>
        </div>
      ))}
    </div>
  );
}
