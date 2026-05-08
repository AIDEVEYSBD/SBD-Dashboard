"use client";

import type { KpiTile } from "@/lib/types";
import { KpiStrip } from "./Kpi";
import { useTweaks } from "./TweaksContext";

// Server components pass tiles in; this thin wrapper picks up the chartStyle tweak.
export function KpiStripClient({ tiles }: { tiles: KpiTile[] }) {
  const { chartStyle } = useTweaks();
  return <KpiStrip tiles={tiles} chartVariant={chartStyle} />;
}
