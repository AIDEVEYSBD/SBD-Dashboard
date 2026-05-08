"use client";

import type { ChartPoint } from "./Chart";
import { Chart } from "./Chart";
import { useTweaks } from "./TweaksContext";

// Trend chart wrapper — picks up the chartStyle tweak from context.
export function TrendChartClient({
  data,
  height,
  color,
}: {
  data: ChartPoint[];
  height?: number;
  color?: string;
}) {
  const { chartStyle } = useTweaks();
  return <Chart data={data} variant={chartStyle} height={height} color={color} />;
}
