// Server-side aggregation. Every page reads from these functions — never
// from the raw dataset. Replace getDataset() with real DB calls without
// touching page code.

import { NOW } from "./clock";
import {
  baseStatus,
  isOverdue,
  isTerminal,
  lifecycleBucket,
  pillVariantFor,
  shortStatus,
  type LifecycleBucket,
  BUCKET_COLOR,
} from "./statuses";
import type {
  AgeBucket,
  Assessment,
  AssessmentKind,
  BreakdownSegment,
  FunnelStep,
  IcaaAssessment,
  IsaAssessment,
  KpiTile,
  MonthlyPoint,
  OrgRow,
  PillVariant,
  ReviewerLoad,
  WatchlistItem,
} from "./types";
import { SLA_HOURS } from "./types";
import { getDataset } from "./data";

// ---------- Helpers ----------

const DAY = 86_400_000;
const ymKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const monthLabel = (d: Date) =>
  d.toLocaleString("en-US", { month: "short" });

function daysAgo(d: Date): number { return (NOW.getTime() - d.getTime()) / DAY; }

function lastNMonthKeys(n: number): { key: string; label: string; date: Date }[] {
  const out: { key: string; label: string; date: Date }[] = [];
  const start = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - (n - 1), 1));
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    out.push({ key: ymKey(d), label: monthLabel(d), date: d });
  }
  return out;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[idx]!;
}

function fmtNum(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString();
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${fmtNum(n)}`;
}

function dirFromDelta(n: number, isLowerBetter = false): "up" | "down" | "flat" {
  if (Math.abs(n) < 0.01) return "flat";
  const positive = n > 0;
  if (isLowerBetter) return positive ? "down" : "up";
  return positive ? "up" : "down";
}

// ---------- Dataset summary (for the Import page) ----------

import { existsSync, statSync } from "node:fs";
import { JSON_PATH } from "./data";

export interface DatasetSummary {
  icaaTotal: number;
  isaTotal: number;
  icaaInFlight: number;
  isaInFlight: number;
  icaaCompleted: number;
  isaCompleted: number;
  lastModified: Date | null;
}

export function getDatasetSummary(): DatasetSummary {
  const { icaa, isa } = getDataset();
  let lastModified: Date | null = null;
  try {
    if (existsSync(JSON_PATH)) lastModified = statSync(JSON_PATH).mtime;
  } catch {
    // ignore
  }
  return {
    icaaTotal: icaa.length,
    isaTotal: isa.length,
    icaaInFlight: icaa.filter((a) => !isTerminal("ICAA", a.status)).length,
    isaInFlight: isa.filter((a) => !isTerminal("ISA", a.status)).length,
    icaaCompleted: icaa.filter((a) => baseStatus(a.status) === "Completed").length,
    isaCompleted: isa.filter((a) => baseStatus(a.status) === "Completed").length,
    lastModified,
  };
}

// ---------- Top-level KPI strip (Overview) ----------

export function getOverviewKpis(): KpiTile[] {
  const { icaa, isa } = getDataset();
  const all = [...icaa, ...isa];

  // 1) Total in flight
  const inFlight = all.filter((a) => !isTerminal(a.kind, a.status));
  const inFlightLast: number[] = lastNMonthKeys(10).map(({ date }) =>
    all.filter((a) => a.dateSent <= endOfMonth(date) && !isClosedByMonth(a, date)).length,
  );

  // 2) SLA compliance % across closed in trailing 30d
  const trailing30 = (a: Assessment) => {
    const closed = a.cyberApprovalDate ?? a.dateFinalized;
    if (!closed) return false;
    return daysAgo(closed) <= 30;
  };
  const closed30 = all.filter(trailing30);
  const slaOk = closed30.filter((a) => a.hoursForSbdToReview <= SLA_HOURS[a.kind]);
  const slaPct = closed30.length > 0 ? (slaOk.length / closed30.length) * 100 : 0;

  // 6-month SLA% trend
  const slaTrend = lastNMonthKeys(8).map(({ date }) => {
    const closedThisMonth = all.filter((a) => {
      const c = a.cyberApprovalDate ?? a.dateFinalized;
      return c && c >= startOfMonth(date) && c <= endOfMonth(date);
    });
    const ok = closedThisMonth.filter((a) => a.hoursForSbdToReview <= SLA_HOURS[a.kind]);
    return closedThisMonth.length > 0 ? Math.round((ok.length / closedThisMonth.length) * 100) : 0;
  });

  // 3) Avg SBD hours (median is more honest)
  const recent = closed30;
  const medSbd = median(recent.map((a) => a.hoursForSbdToReview));
  const sbdTrend = lastNMonthKeys(8).map(({ date }) => {
    const m = all.filter((a) => {
      const c = a.cyberApprovalDate ?? a.dateFinalized;
      return c && c >= startOfMonth(date) && c <= endOfMonth(date);
    });
    return Math.round(median(m.map((a) => a.hoursForSbdToReview)));
  });

  // 4) Currently overdue
  const overdueCount = all.filter((a) => !isTerminal(a.kind, a.status) && isOverdue(a.status)).length;
  const overdueTrend = lastNMonthKeys(8).map(({ date }) => {
    return all.filter((a) =>
      a.dateSent <= endOfMonth(date) &&
      !isClosedByMonth(a, date) &&
      isOverdue(a.status),
    ).length;
  });

  // 5) AI-involved ICAAs (count, all-time within trailing 12mo)
  const last12 = lastNMonthKeys(12).map((m) => m.date);
  const aiInvolvedAll = icaa.filter((a) => a.q18AiInvolved === "Yes" && a.dateSent >= last12[0]!);
  const aiTrend = lastNMonthKeys(8).map(({ date }) =>
    icaa.filter((a) => a.q18AiInvolved === "Yes" && a.dateSent >= startOfMonth(date) && a.dateSent <= endOfMonth(date)).length
  );

  // Compute deltas vs prior month for SLA / overdue / SBD hours
  const slaDelta = (slaTrend[slaTrend.length - 1] ?? 0) - (slaTrend[slaTrend.length - 2] ?? 0);
  const sbdDelta = (sbdTrend[sbdTrend.length - 1] ?? 0) - (sbdTrend[sbdTrend.length - 2] ?? 0);
  const overdueDelta = (overdueTrend[overdueTrend.length - 1] ?? 0) - (overdueTrend[overdueTrend.length - 2] ?? 0);

  return [
    {
      label: "Assessments in flight",
      value: inFlight.length.toLocaleString(),
      delta: fmtSigned(inFlightLast[inFlightLast.length - 1]! - inFlightLast[inFlightLast.length - 2]!),
      dir: dirFromDelta(inFlightLast[inFlightLast.length - 1]! - inFlightLast[inFlightLast.length - 2]!),
      note: "vs. last month",
      spark: inFlightLast,
    },
    {
      label: "SLA compliance",
      value: Math.round(slaPct).toString(),
      unit: "%",
      delta: `${slaDelta >= 0 ? "+" : ""}${slaDelta.toFixed(0)}pt`,
      dir: dirFromDelta(slaDelta),
      note: "trailing 30d",
      spark: slaTrend,
      color: "var(--ok)",
    },
    {
      label: "Median SBD hours",
      value: medSbd.toFixed(1),
      unit: "h",
      delta: `${sbdDelta >= 0 ? "+" : ""}${sbdDelta.toFixed(0)}h`,
      dir: dirFromDelta(sbdDelta, true),
      note: "30-day median",
      spark: sbdTrend,
      color: "var(--accent)",
    },
    {
      label: "Currently overdue",
      value: overdueCount.toLocaleString(),
      delta: fmtSigned(overdueDelta),
      dir: dirFromDelta(overdueDelta, true),
      note: "all in-flight",
      spark: overdueTrend,
      color: "var(--bad)",
    },
    {
      label: "AI-flagged ICAAs",
      value: aiInvolvedAll.length.toLocaleString(),
      delta: fmtSigned((aiTrend[aiTrend.length - 1] ?? 0) - (aiTrend[aiTrend.length - 2] ?? 0)),
      dir: dirFromDelta((aiTrend[aiTrend.length - 1] ?? 0) - (aiTrend[aiTrend.length - 2] ?? 0)),
      note: "Q18 = Yes (12mo)",
      spark: aiTrend,
      color: "var(--accent-2)",
    },
  ];
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59));
}

// "Was this assessment closed by the end of this month?"
function isClosedByMonth(a: Assessment, monthDate: Date): boolean {
  const c = a.cyberApprovalDate ?? a.dateFinalized ?? a.dateWithdrawn;
  if (!c) return false;
  return c <= endOfMonth(monthDate);
}

// ---------- KPI strip — kind-specific (ICAA / ISA pages) ----------

export function getKindKpis(kind: AssessmentKind): KpiTile[] {
  const { icaa, isa } = getDataset();
  const set = kind === "ICAA" ? icaa : isa;
  const sla = SLA_HOURS[kind];

  const inFlight = set.filter((a) => !isTerminal(kind, a.status));
  const overdue = inFlight.filter((a) => isOverdue(a.status));
  const closed30 = set.filter((a) => {
    const c = a.cyberApprovalDate ?? a.dateFinalized;
    return c && daysAgo(c) <= 30;
  });
  const slaOk = closed30.filter((a) => a.hoursForSbdToReview <= sla);
  const slaPct = closed30.length > 0 ? (slaOk.length / closed30.length) * 100 : 0;
  const medSbd = median(closed30.map((a) => a.hoursForSbdToReview));
  const meanSbd = closed30.length > 0
    ? closed30.reduce((s, a) => s + a.hoursForSbdToReview, 0) / closed30.length
    : 0;
  const p90 = percentile(closed30.map((a) => a.hoursForSbdToReview), 90);

  // Approval → Finalize lag (days). Only records with both dates qualify.
  const lagDays = set
    .filter((a) => a.cyberApprovalDate && a.dateFinalized)
    .map((a) => (a.dateFinalized!.getTime() - a.cyberApprovalDate!.getTime()) / DAY)
    .filter((v) => v >= 0);
  const medLag = median(lagDays);
  const trendLag = lastNMonthKeys(8).map(({ date }) => {
    const m = set
      .filter((a) => a.dateFinalized && a.dateFinalized >= startOfMonth(date) && a.dateFinalized <= endOfMonth(date))
      .filter((a) => a.cyberApprovalDate)
      .map((a) => (a.dateFinalized!.getTime() - a.cyberApprovalDate!.getTime()) / DAY)
      .filter((v) => v >= 0);
    return Math.round(median(m) * 10) / 10;
  });

  const trendInFlight = lastNMonthKeys(10).map(({ date }) =>
    set.filter((a) => a.dateSent <= endOfMonth(date) && !isClosedByMonth(a, date)).length,
  );
  const trendSla = lastNMonthKeys(8).map(({ date }) => {
    const m = set.filter((a) => {
      const c = a.cyberApprovalDate ?? a.dateFinalized;
      return c && c >= startOfMonth(date) && c <= endOfMonth(date);
    });
    const ok = m.filter((a) => a.hoursForSbdToReview <= sla);
    return m.length > 0 ? Math.round((ok.length / m.length) * 100) : 0;
  });
  const trendMed = lastNMonthKeys(8).map(({ date }) => {
    const m = set.filter((a) => {
      const c = a.cyberApprovalDate ?? a.dateFinalized;
      return c && c >= startOfMonth(date) && c <= endOfMonth(date);
    });
    return Math.round(median(m.map((a) => a.hoursForSbdToReview)));
  });
  const trendOverdue = lastNMonthKeys(8).map(({ date }) =>
    set.filter((a) => a.dateSent <= endOfMonth(date) && !isClosedByMonth(a, date) && isOverdue(a.status)).length,
  );

  return [
    {
      label: `${kind}s in flight`,
      value: inFlight.length.toLocaleString(),
      delta: fmtSigned((trendInFlight[trendInFlight.length - 1] ?? 0) - (trendInFlight[trendInFlight.length - 2] ?? 0)),
      dir: dirFromDelta((trendInFlight[trendInFlight.length - 1] ?? 0) - (trendInFlight[trendInFlight.length - 2] ?? 0)),
      note: "vs. last month",
      spark: trendInFlight,
    },
    {
      label: "SLA compliance",
      value: Math.round(slaPct).toString(),
      unit: "%",
      note: `target ≤ ${sla}h`,
      spark: trendSla,
      color: "var(--ok)",
    },
    {
      label: "Median SBD hours",
      value: medSbd.toFixed(1),
      unit: "h",
      note: `mean ${meanSbd.toFixed(1)}h · 30-day`,
      spark: trendMed,
      color: "var(--accent)",
    },
    {
      label: "p90 SBD hours",
      value: p90.toFixed(1),
      unit: "h",
      note: "long-tail signal",
      spark: trendMed.map((v) => Math.round(v * 1.6)),
      color: "var(--warn)",
    },
    {
      label: "Approval → finalize",
      value: medLag.toFixed(1),
      unit: "d",
      note: "median post-approval lag",
      spark: trendLag,
      color: "var(--accent-2)",
    },
    {
      label: "Currently overdue",
      value: overdue.length.toLocaleString(),
      note: `${((overdue.length / Math.max(1, inFlight.length)) * 100).toFixed(0)}% of in-flight`,
      spark: trendOverdue,
      color: "var(--bad)",
    },
  ];
}

// ---------- Status breakdown ----------

export function getStatusBreakdown(kind: AssessmentKind): BreakdownSegment[] {
  const { icaa, isa } = getDataset();
  const set = kind === "ICAA" ? icaa : isa;

  const counts = new Map<LifecycleBucket, number>();
  for (const a of set) {
    const b = lifecycleBucket(a.status);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  const order: LifecycleBucket[] = [
    "Not started",
    "With requester",
    "Pending owner approval",
    "In security review",
    "Completed",
    "Rejected",
    "Withdrawn",
    "Archived",
  ];
  return order
    .filter((k) => (counts.get(k) ?? 0) > 0)
    .map((k) => ({ label: k, value: counts.get(k) ?? 0, color: BUCKET_COLOR[k] }));
}

// Detailed (overdue split) — for the granular status table.
export interface StatusRow {
  status: string;
  short: string;
  count: number;
  variant: PillVariant;
  overdue: boolean;
}

export function getStatusRows(kind: AssessmentKind): StatusRow[] {
  const { icaa, isa } = getDataset();
  const set = kind === "ICAA" ? icaa : isa;
  const counts = new Map<string, number>();
  for (const a of set) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
  return [...counts.entries()]
    .map(([status, count]) => ({
      status,
      short: shortStatus(status),
      count,
      variant: pillVariantFor(status),
      overdue: isOverdue(status),
    }))
    .sort((a, b) => b.count - a.count);
}

// ---------- WIP at month-end (stock series, paired with the volume flow series) ----------

export function getWipMonthly(kind: AssessmentKind | "ALL", months = 12): MonthlyPoint[] {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = kind === "ALL" ? [...icaa, ...isa] : kind === "ICAA" ? icaa : isa;
  return lastNMonthKeys(months).map(({ key, label, date }) => {
    const monthEnd = endOfMonth(date);
    const value = set.filter((a) => a.dateSent <= monthEnd && !isClosedByMonth(a, date)).length;
    return { month: key, label, value };
  });
}

// ---------- Monthly volume (sent / completed / rejected / withdrawn) ----------

export interface MonthlyVolume {
  month: string;
  label: string;
  sent: number;
  completed: number;
  rejected: number;
  withdrawn: number;
}

export function getMonthlyVolume(kind: AssessmentKind | "ALL", months = 12): MonthlyVolume[] {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = kind === "ALL" ? [...icaa, ...isa] : kind === "ICAA" ? icaa : isa;

  return lastNMonthKeys(months).map(({ key, label, date }) => {
    const s = startOfMonth(date), e = endOfMonth(date);
    let sent = 0, completed = 0, rejected = 0, withdrawn = 0;
    for (const a of set) {
      if (a.dateSent >= s && a.dateSent <= e) sent++;
      if (a.dateFinalized && baseStatus(a.status) === "Completed" && a.dateFinalized >= s && a.dateFinalized <= e) completed++;
      if (baseStatus(a.status).startsWith("Rejected") && a.dateFinalized && a.dateFinalized >= s && a.dateFinalized <= e) rejected++;
      if (a.dateWithdrawn && a.dateWithdrawn >= s && a.dateWithdrawn <= e) withdrawn++;
    }
    return { month: key, label, sent, completed, rejected, withdrawn };
  });
}

// ---------- Aging ----------

export function getAgeBuckets(kind: AssessmentKind | "ALL"): AgeBucket[] {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = kind === "ALL" ? [...icaa, ...isa] : kind === "ICAA" ? icaa : isa;
  const inFlight = set.filter((a) => !isTerminal(a.kind, a.status));
  const buckets = [
    { label: "0–7d", count: 0, max: 7 },
    { label: "8–14d", count: 0, max: 14 },
    { label: "15–30d", count: 0, max: 30 },
    { label: "31–60d", count: 0, max: 60 },
    { label: "60+d", count: 0, max: Infinity },
  ];
  for (const a of inFlight) {
    const age = daysAgo(a.dateSent);
    for (const b of buckets) {
      if (age <= b.max) { b.count++; break; }
    }
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}

export function getDaysOverdueDistribution(kind: AssessmentKind | "ALL"): AgeBucket[] {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = kind === "ALL" ? [...icaa, ...isa] : kind === "ICAA" ? icaa : isa;
  const overdue = set.filter((a) => !isTerminal(a.kind, a.status) && isOverdue(a.status));
  const buckets = [
    { label: "1–3d", count: 0, max: 3 },
    { label: "4–7d", count: 0, max: 7 },
    { label: "8–14d", count: 0, max: 14 },
    { label: "15–30d", count: 0, max: 30 },
    { label: "30+d", count: 0, max: Infinity },
  ];
  for (const a of overdue) {
    for (const b of buckets) {
      if (a.daysOverdue <= b.max) { b.count++; break; }
    }
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}

// ---------- Watchlists ----------

function toWatchlist(a: Assessment, meta: string): WatchlistItem {
  return {
    id: a.id,
    application: a.applicationName,
    reviewer: a.reviewer,
    status: shortStatus(a.status),
    pillVariant: pillVariantFor(a.status),
    meta,
  };
}

export function getOverdueWatchlist(kind: AssessmentKind | "ALL", limit = 10): WatchlistItem[] {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = kind === "ALL" ? [...icaa, ...isa] : kind === "ICAA" ? icaa : isa;
  return set
    .filter((a) => !isTerminal(a.kind, a.status) && isOverdue(a.status))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, limit)
    .map((a) => toWatchlist(a, `+${Math.round(a.daysOverdue)}d overdue`));
}

export function getApproachingBreachWatchlist(kind: AssessmentKind | "ALL", limit = 10): WatchlistItem[] {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = kind === "ALL" ? [...icaa, ...isa] : kind === "ICAA" ? icaa : isa;
  return set
    .filter((a) => !isTerminal(a.kind, a.status) && !isOverdue(a.status))
    .map((a) => ({ a, ratio: a.hoursForSbdToReview / SLA_HOURS[a.kind] }))
    .filter((x) => x.ratio >= 0.6)
    .sort((x, y) => y.ratio - x.ratio)
    .slice(0, limit)
    .map(({ a, ratio }) => toWatchlist(a, `${Math.round(ratio * 100)}% of SLA`));
}

export function getStaleUnassigned(limit = 10): WatchlistItem[] {
  const { icaa, isa } = getDataset();
  const all = [...icaa, ...isa];
  return all
    .filter((a) => !isTerminal(a.kind, a.status) && a.reviewer === null)
    .sort((a, b) => b.daysUnassigned - a.daysUnassigned)
    .slice(0, limit)
    .map((a) => toWatchlist(a, `${Math.round(a.daysUnassigned)}d unassigned`));
}

export function getReassessmentForecast(limit = 10): WatchlistItem[] {
  const { isa } = getDataset();
  const horizon = new Date(NOW.getTime() + 90 * DAY);
  return isa
    .filter((a) => a.nextAssessmentDate && a.nextAssessmentDate >= NOW && a.nextAssessmentDate <= horizon)
    .sort((a, b) => (a.nextAssessmentDate!.getTime() - b.nextAssessmentDate!.getTime()))
    .slice(0, limit)
    .map((a) => toWatchlist(a, `due ${formatRelativeDays(a.nextAssessmentDate!)}`));
}

function formatRelativeDays(d: Date): string {
  const days = Math.round((d.getTime() - NOW.getTime()) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

// ---------- Conversion (ICAA → ISA) ----------

export interface ConversionStats {
  totalIcaa: number;
  finalizedIcaa: number;
  convertedIcaa: number;
  conversionPct: number;
  monthly: { month: string; label: string; finalized: number; converted: number; pct: number }[];
  funnel: FunnelStep[];
  conversionLagDaysMedian: number;
  byRiskCat: { cat: string; finalized: number; converted: number; pct: number }[];
}

export function getConversionStats(): ConversionStats {
  const { icaa, isa } = getDataset();

  const finalized = icaa.filter((a) => a.dateFinalized);
  const converted = finalized.filter((a) => a.isaIdLink);

  const monthly = lastNMonthKeys(10).map(({ key, label, date }) => {
    const s = startOfMonth(date), e = endOfMonth(date);
    const finM = finalized.filter((a) => a.dateFinalized! >= s && a.dateFinalized! <= e);
    const convM = finM.filter((a) => a.isaIdLink);
    return {
      month: key,
      label,
      finalized: finM.length,
      converted: convM.length,
      pct: finM.length > 0 ? Math.round((convM.length / finM.length) * 100) : 0,
    };
  });

  // Funnel — across all ICAA
  const sent = icaa.length;
  const started = icaa.filter((a) => !baseStatus(a.status).startsWith("Not started")).length;
  const submitted = icaa.filter((a) =>
    !baseStatus(a.status).startsWith("Not started") &&
    !baseStatus(a.status).startsWith("Ready to Submit") &&
    !baseStatus(a.status).startsWith("In-progress with requestor"),
  ).length;
  const inReview = icaa.filter((a) => baseStatus(a.status).startsWith("Security Validation") || baseStatus(a.status) === "Completed" || baseStatus(a.status).startsWith("Rejected")).length;
  const cyberApproved = icaa.filter((a) => a.cyberApprovalDate).length;
  const finalizedCount = finalized.length;
  const convertedCount = converted.length;

  const funnel: FunnelStep[] = [
    { label: "ICAA Sent", value: sent },
    { label: "Started", value: started },
    { label: "Submitted", value: submitted },
    { label: "In Review", value: inReview },
    { label: "Cyber Approved", value: cyberApproved },
    { label: "Finalized", value: finalizedCount },
    { label: "→ Converted to ISA", value: convertedCount },
  ];

  // Conversion lag
  const isaByParent = new Map(isa.filter((x) => x.parentIcaaId).map((x) => [x.parentIcaaId!, x] as const));
  const lags: number[] = [];
  for (const a of converted) {
    const child = isaByParent.get(a.id);
    if (!child) continue;
    if (a.dateFinalized && child.dateSent) {
      lags.push(Math.max(0, (child.dateSent.getTime() - a.dateFinalized.getTime()) / DAY));
    }
  }
  const lagMedian = median(lags);

  const cats = ["Low", "Medium", "High", "Critical"] as const;
  const byRiskCat = cats.map((cat) => {
    const finCat = finalized.filter((a) => a.inherentRiskCategorization === cat);
    const convCat = finCat.filter((a) => a.isaIdLink);
    return {
      cat,
      finalized: finCat.length,
      converted: convCat.length,
      pct: finCat.length > 0 ? Math.round((convCat.length / finCat.length) * 100) : 0,
    };
  });

  return {
    totalIcaa: icaa.length,
    finalizedIcaa: finalized.length,
    convertedIcaa: converted.length,
    conversionPct: finalized.length > 0 ? (converted.length / finalized.length) * 100 : 0,
    monthly,
    funnel,
    conversionLagDaysMedian: lagMedian,
    byRiskCat,
  };
}

// ---------- People / org ----------

export function getReviewerLoads(): ReviewerLoad[] {
  const { icaa, isa, people } = getDataset();
  const all: Assessment[] = [...icaa, ...isa];

  return people.map((p) => {
    const mine = all.filter((a) => a.reviewer === p.code);
    const active = mine.filter((a) => !isTerminal(a.kind, a.status)).length;
    const closed30 = mine.filter((a) => {
      const c = a.cyberApprovalDate ?? a.dateFinalized;
      return c && daysAgo(c) <= 30;
    });
    const slaOk = closed30.filter((a) => a.hoursForSbdToReview <= SLA_HOURS[a.kind]).length;
    const avgHours = closed30.length > 0
      ? closed30.reduce((s, a) => s + a.hoursForSbdToReview, 0) / closed30.length
      : 0;

    // Nominal capacity: 8 active assessments per analyst
    const load = Math.min(100, Math.round((active / 8) * 100));

    return {
      code: p.code,
      name: p.name,
      role: p.role,
      active,
      closed30d: closed30.length,
      avgSbdHours: avgHours,
      slaPct: closed30.length > 0 ? Math.round((slaOk / closed30.length) * 100) : 0,
      load,
    };
  }).sort((a, b) => b.active - a.active);
}

export function getOrgBreakdown(field: "serviceVpOrg" | "serviceDirectorOrg"): OrgRow[] {
  const { icaa, isa } = getDataset();
  const all: Assessment[] = [...icaa, ...isa];
  const counts = new Map<string, { total: number; inFlight: number; overdue: number }>();
  for (const a of all) {
    const k = a[field];
    const cur = counts.get(k) ?? { total: 0, inFlight: 0, overdue: 0 };
    cur.total++;
    if (!isTerminal(a.kind, a.status)) cur.inFlight++;
    if (isOverdue(a.status)) cur.overdue++;
    counts.set(k, cur);
  }
  return [...counts.entries()]
    .map(([org, v]) => ({ org, ...v }))
    .sort((a, b) => b.total - a.total);
}

export function getTopRequesters(limit = 10): { name: string; total: number; rejectedRatio: number }[] {
  const { icaa } = getDataset();
  const map = new Map<string, { total: number; rejected: number }>();
  for (const a of icaa) {
    for (const r of a.requesters) {
      const cur = map.get(r) ?? { total: 0, rejected: 0 };
      cur.total++;
      if (baseStatus(a.status).startsWith("Rejected")) cur.rejected++;
      map.set(r, cur);
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, total: v.total, rejectedRatio: v.total > 0 ? v.rejected / v.total : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// ---------- Risk / classification breakdowns ----------

export function getRiskBreakdown(kind: AssessmentKind): BreakdownSegment[] {
  const { icaa, isa } = getDataset();
  const set = kind === "ICAA" ? icaa : isa;
  const counts = new Map<string, number>();
  for (const a of set) counts.set(a.inherentRiskCategorization, (counts.get(a.inherentRiskCategorization) ?? 0) + 1);
  const order = ["Low", "Medium", "High", "Critical"];
  const colors: Record<string, string> = {
    Low: "var(--ok)",
    Medium: "var(--info)",
    High: "var(--warn)",
    Critical: "var(--bad)",
  };
  return order
    .filter((k) => (counts.get(k) ?? 0) > 0)
    .map((k) => ({ label: k, value: counts.get(k) ?? 0, color: colors[k]! }));
}

export function getInfoClassBreakdown(kind: AssessmentKind): BreakdownSegment[] {
  const { icaa, isa } = getDataset();
  const set = kind === "ICAA" ? icaa : isa;
  const counts = new Map<string, number>();
  for (const a of set) counts.set(a.informationClassification, (counts.get(a.informationClassification) ?? 0) + 1);
  const order = ["Public", "Internal", "Confidential", "Highly Confidential", "Restricted"];
  const colors: Record<string, string> = {
    Public: "var(--ink-5)",
    Internal: "var(--ink-4)",
    Confidential: "var(--info)",
    "Highly Confidential": "var(--warn)",
    Restricted: "var(--bad)",
  };
  return order
    .filter((k) => (counts.get(k) ?? 0) > 0)
    .map((k) => ({ label: k, value: counts.get(k) ?? 0, color: colors[k]! }));
}

export function getCriticalityBreakdown(kind: AssessmentKind): BreakdownSegment[] {
  const { icaa, isa } = getDataset();
  const set = kind === "ICAA" ? icaa : isa;
  const counts = new Map<string, number>();
  for (const a of set) counts.set(a.serviceCriticality, (counts.get(a.serviceCriticality) ?? 0) + 1);
  const order = ["Low", "Medium", "High", "Mission Critical"];
  const colors: Record<string, string> = {
    Low: "var(--ink-5)",
    Medium: "var(--info)",
    High: "var(--warn)",
    "Mission Critical": "var(--bad)",
  };
  return order
    .filter((k) => (counts.get(k) ?? 0) > 0)
    .map((k) => ({ label: k, value: counts.get(k) ?? 0, color: colors[k]! }));
}

export function getHostingBreakdown(kind: AssessmentKind): BreakdownSegment[] {
  const { icaa, isa } = getDataset();
  const counts = new Map<string, number>();
  if (kind === "ICAA") {
    for (const a of icaa) counts.set(a.hostingTypeNew, (counts.get(a.hostingTypeNew) ?? 0) + 1);
  } else {
    for (const a of isa) counts.set(a.hostingType, (counts.get(a.hostingType) ?? 0) + 1);
  }
  const palette = ["var(--accent)", "var(--info)", "var(--warn)", "var(--ok)", "var(--accent-2)", "var(--ink-4)"];
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v], i) => ({ label: k, value: v, color: palette[i % palette.length]! }));
}

export function getGeographyBreakdown(): BreakdownSegment[] {
  const { icaa } = getDataset();
  const counts = new Map<string, number>();
  for (const a of icaa) counts.set(a.geography, (counts.get(a.geography) ?? 0) + 1);
  const palette = ["var(--accent)", "var(--info)", "var(--warn)", "var(--ok)", "var(--accent-2)"];
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v], i) => ({ label: k, value: v, color: palette[i % palette.length]! }));
}

// ---------- ISA design score improvement ----------

export interface DesignScoreStats {
  avgInitial: number;
  avgCurrent: number;
  avgImprovement: number;
  byLevel: { level: string; initial: number; current: number; n: number }[];
}

export function getDesignScoreStats(): DesignScoreStats {
  const { isa } = getDataset();
  const finalized = isa.filter((a) => a.dateFinalized);
  if (finalized.length === 0) {
    return { avgInitial: 0, avgCurrent: 0, avgImprovement: 0, byLevel: [] };
  }
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const avgInitial = avg(finalized.map((a) => a.initialDesignScore));
  const avgCurrent = avg(finalized.map((a) => a.currentDesignScore));
  const levels = ["L1", "L2", "L3"];
  const byLevel = levels.map((level) => {
    const sub = finalized.filter((a) => a.isaLevel === level);
    return {
      level,
      initial: sub.length > 0 ? avg(sub.map((a) => a.initialDesignScore)) : 0,
      current: sub.length > 0 ? avg(sub.map((a) => a.currentDesignScore)) : 0,
      n: sub.length,
    };
  });
  return {
    avgInitial,
    avgCurrent,
    avgImprovement: avgCurrent - avgInitial,
    byLevel,
  };
}

// ---------- AI involvement ----------

export interface AiStats {
  totalIcaa: number;
  aiFlagged: number;
  pct: number;
  monthly: MonthlyPoint[];
  aiConverted: number;
  aiConversionPct: number;
}

export function getAiStats(): AiStats {
  const { icaa } = getDataset();
  const ai = icaa.filter((a) => a.q18AiInvolved === "Yes");
  const monthly = lastNMonthKeys(12).map(({ key, label, date }) => {
    const s = startOfMonth(date), e = endOfMonth(date);
    return {
      month: key,
      label,
      value: icaa.filter((a) => a.q18AiInvolved === "Yes" && a.dateSent >= s && a.dateSent <= e).length,
    };
  });
  const aiConverted = ai.filter((a) => a.isaIdLink).length;
  return {
    totalIcaa: icaa.length,
    aiFlagged: ai.length,
    pct: icaa.length > 0 ? (ai.length / icaa.length) * 100 : 0,
    monthly,
    aiConverted,
    aiConversionPct: ai.length > 0 ? (aiConverted / ai.length) * 100 : 0,
  };
}

// ---------- 30-day daily trend (for the trend chart) ----------

export function getDailyInFlight(kind: AssessmentKind | "ALL", days = 30): MonthlyPoint[] {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = kind === "ALL" ? [...icaa, ...isa] : kind === "ICAA" ? icaa : isa;
  const out: MonthlyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(NOW.getTime() - i * DAY);
    const cnt = set.filter((a) => {
      if (a.dateSent > day) return false;
      const c = a.cyberApprovalDate ?? a.dateFinalized ?? a.dateWithdrawn;
      return !c || c >= day;
    }).length;
    out.push({
      month: day.toISOString().slice(0, 10),
      label: i === days - 1 ? day.toLocaleString("en-US", { month: "short", day: "2-digit" })
            : i === 0 ? day.toLocaleString("en-US", { month: "short", day: "2-digit" })
            : "",
      value: cnt,
    });
  }
  return out;
}

// ---------- Time-in-stage (where do hours go?) ----------

export interface TimeInStageRow {
  stage: string;
  hours: number;
  color: string;
}

export function getTimeInStage(kind: AssessmentKind): TimeInStageRow[] {
  const { icaa, isa } = getDataset();
  const set = kind === "ICAA" ? icaa : isa;
  const closed = set.filter((a) => a.dateFinalized);
  if (closed.length === 0) return [];
  const avg = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  return [
    { stage: "SBD review", hours: avg(closed.map((a) => a.hoursForSbdToReview)), color: "var(--accent)" },
    { stage: "With requester (info req.)", hours: avg(closed.map((a) => a.hoursWithRequesterInfoRequested)), color: "var(--info)" },
    { stage: "With business / service owner", hours: avg(closed.map((a) => a.hoursWithBusinessOrServiceOwner)), color: "var(--warn)" },
    { stage: "Requester submission", hours: avg(closed.map((a) => a.hoursForRequesterToSubmit)), color: "var(--ok)" },
  ];
}

// ---------- Filtered list for table pages ----------

export interface ListFilters {
  kind: AssessmentKind;
  status?: string;
  reviewer?: string;
  riskCat?: string;
  overdueOnly?: boolean;
  inFlightOnly?: boolean;
  search?: string;
}

export interface ListResult {
  rows: Assessment[];
  total: number;
}

export function listAssessments(filters: ListFilters, page = 1, pageSize = 25): ListResult {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = filters.kind === "ICAA" ? icaa : isa;
  const filtered = set.filter((a) => {
    if (filters.status && a.status !== filters.status) return false;
    if (filters.reviewer && a.reviewer !== filters.reviewer) return false;
    if (filters.riskCat && a.inherentRiskCategorization !== filters.riskCat) return false;
    if (filters.overdueOnly && !isOverdue(a.status)) return false;
    if (filters.inFlightOnly && isTerminal(a.kind, a.status)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!a.applicationName.toLowerCase().includes(q) && !a.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Sort: in-flight first by overdue/oldest; terminal records by most recent finalize.
  filtered.sort((a, b) => {
    const aDone = isTerminal(a.kind, a.status), bDone = isTerminal(b.kind, b.status);
    if (aDone !== bDone) return aDone ? 1 : -1;
    if (!aDone) {
      const aO = isOverdue(a.status) ? 1 : 0;
      const bO = isOverdue(b.status) ? 1 : 0;
      if (aO !== bO) return bO - aO;
      return a.dateSent.getTime() - b.dateSent.getTime();
    }
    return (b.dateFinalized?.getTime() ?? 0) - (a.dateFinalized?.getTime() ?? 0);
  });

  const start = (page - 1) * pageSize;
  return { rows: filtered.slice(start, start + pageSize), total: filtered.length };
}
