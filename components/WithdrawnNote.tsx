"use client";

import type { WithdrawnStats } from "@/lib/queries";
import { Spark } from "./Spark";

// A subtle banner reminding analysts that withdrawn assessments don't roll
// into headline billing metrics — and surfacing the count separately.
export function WithdrawnNote({ stats, kind }: { stats: WithdrawnStats; kind: "ICAA" | "ISA" | "ALL" }) {
  const label = kind === "ALL" ? "assessments" : `${kind}s`;
  return (
    <div className="withdrawn-note">
      <div className="withdrawn-note-text">
        <span className="eyebrow">Excluded from billing</span>
        <p>
          <span className="withdrawn-note-count">{stats.total.toLocaleString()}</span>{" "}
          withdrawn {label} aren't counted in the headline metrics above
          {stats.last30d > 0 ? (
            <> — <span className="withdrawn-note-recent">{stats.last30d}</span> in the last 30 days.</>
          ) : (
            <>.</>
          )}
        </p>
      </div>
      <div className="withdrawn-note-spark">
        <Spark data={stats.monthly.map((m) => m.value)} color="var(--ink-4)" variant="bar" />
      </div>
    </div>
  );
}
