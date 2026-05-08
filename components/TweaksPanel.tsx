"use client";

import { useState } from "react";
import { useTweaks, type ChartStyle } from "./TweaksContext";

export function TweaksPanel() {
  const { chartStyle, setChartStyle } = useTweaks();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        className="btn btn-sm tweaks-toggle"
        onClick={() => setOpen(true)}
        aria-label="Open tweaks panel"
      >
        Chart style
      </button>
    );
  }

  return (
    <div className="tweaks">
      <div className="tweaks-head">
        <span className="tweaks-title">Tweaks</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Close</button>
      </div>

      <div className="tweaks-section">
        <div className="tweaks-label">Chart style</div>
        <div className="tweaks-sub">Sparklines + trend chart.</div>
        <div className="tweaks-radio">
          {(["line", "area", "bar"] as ChartStyle[]).map((s) => (
            <button
              key={s}
              className={chartStyle === s ? "on" : ""}
              onClick={() => setChartStyle(s)}
            >
              {s[0]!.toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
