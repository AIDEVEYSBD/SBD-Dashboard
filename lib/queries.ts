// Server-side aggregation. Every page reads from these functions — never
// from the raw dataset. Replace getDataset() with real DB calls without
// touching page code.

import { NOW } from "./clock";
import {
  baseStatus,
  isCompletedLike,
  isOverdue,
  isInProgress,
  isRejected,
  isTerminal,
  isWithdrawn,
  pillVariantFor,
  shortStatus,
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
    icaaInFlight: icaa.filter((a) => isInProgress("ICAA", a.status)).length,
    isaInFlight: isa.filter((a) => isInProgress("ISA", a.status)).length,
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
  const inFlight = all.filter((a) => isInProgress(a.kind, a.status));
  const inFlightLast: number[] = lastNMonthKeys(10).map(({ date }) =>
    all.filter((a) => a.dateSent <= endOfMonth(date) && !isClosedByMonth(a, date)).length,
  );

  // 2) SLA compliance % across closed in trailing 30d.
  // "Completed" = has a Cyber Approval Date (the reviewer-approved date).
  // Date Finalized comes later as the formal record close — the gap between
  // the two is the "Approval → finalize" lag KPI on the kind pages.
  const trailing30 = (a: Assessment) => {
    if (!a.cyberApprovalDate) return false;
    return daysAgo(a.cyberApprovalDate) <= 30;
  };
  const closed30 = all.filter(trailing30);
  const slaOk = closed30.filter((a) => a.hoursForSbdToReview <= SLA_HOURS[a.kind]);
  const slaPct = closed30.length > 0 ? (slaOk.length / closed30.length) * 100 : 0;

  // 6-month SLA% trend
  const slaTrend = lastNMonthKeys(8).map(({ date }) => {
    const closedThisMonth = all.filter((a) =>
      a.cyberApprovalDate &&
      a.cyberApprovalDate >= startOfMonth(date) &&
      a.cyberApprovalDate <= endOfMonth(date),
    );
    const ok = closedThisMonth.filter((a) => a.hoursForSbdToReview <= SLA_HOURS[a.kind]);
    return closedThisMonth.length > 0 ? Math.round((ok.length / closedThisMonth.length) * 100) : 0;
  });

  // 3) Median SBD hours (mean for kind pages, median is the honest one)
  const recent = closed30;
  const medSbd = median(recent.map((a) => a.hoursForSbdToReview));
  const sbdTrend = lastNMonthKeys(8).map(({ date }) => {
    const m = all.filter((a) =>
      a.cyberApprovalDate &&
      a.cyberApprovalDate >= startOfMonth(date) &&
      a.cyberApprovalDate <= endOfMonth(date),
    );
    return Math.round(median(m.map((a) => a.hoursForSbdToReview)));
  });

  // 4) Currently overdue
  const overdueCount = all.filter((a) => isInProgress(a.kind, a.status) && isOverdue(a.status)).length;
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
// Closure can be: cyber approval (completion), withdrawal, or rejection.
// We don't carry a per-record rejection date, so for rejected status we fall
// back to the assessment's own status flag.
function isClosedByMonth(a: Assessment, monthDate: Date): boolean {
  const end = endOfMonth(monthDate);
  if (a.cyberApprovalDate && a.cyberApprovalDate <= end) return true;
  if (a.dateWithdrawn && a.dateWithdrawn <= end) return true;
  return false;
}

// ---------- KPI strip — kind-specific (ICAA / ISA pages) ----------

export function getKindKpis(kind: AssessmentKind): KpiTile[] {
  const { icaa, isa } = getDataset();
  const set = kind === "ICAA" ? icaa : isa;
  const sla = SLA_HOURS[kind];

  const inFlight = set.filter((a) => isInProgress(kind, a.status));
  const overdue = inFlight.filter((a) => isOverdue(a.status));
  const closed30 = set.filter((a) => a.cyberApprovalDate && daysAgo(a.cyberApprovalDate) <= 30);
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
    const m = set.filter((a) =>
      a.cyberApprovalDate &&
      a.cyberApprovalDate >= startOfMonth(date) &&
      a.cyberApprovalDate <= endOfMonth(date),
    );
    const ok = m.filter((a) => a.hoursForSbdToReview <= sla);
    return m.length > 0 ? Math.round((ok.length / m.length) * 100) : 0;
  });
  const trendMed = lastNMonthKeys(8).map(({ date }) => {
    const m = set.filter((a) =>
      a.cyberApprovalDate &&
      a.cyberApprovalDate >= startOfMonth(date) &&
      a.cyberApprovalDate <= endOfMonth(date),
    );
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

// ---------- Status breakdown — high-level lifecycle groupings ----------
//
// Four buckets that match the user's mental model:
//   In-progress   = isInProgress (not done, not withdrawn, not rejected)
//   Completed     = isCompletedLike (completed + archived + pending approvals)
//   Rejected     = isRejected
//   Withdrawn    = isWithdrawn (excluded from billing — shown separately for completeness)
//
// The 16 actual statuses are shown in StatusTable below the breakdown bar.

export function getStatusBreakdown(kind: AssessmentKind): BreakdownSegment[] {
  const { icaa, isa } = getDataset();
  const set = kind === "ICAA" ? icaa : isa;

  let inProgress = 0, completed = 0, rejected = 0, withdrawn = 0;
  for (const a of set) {
    if (isInProgress(a.kind, a.status)) inProgress++;
    else if (isWithdrawn(a.status)) withdrawn++;
    else if (isRejected(a.status)) rejected++;
    else completed++;
  }

  const segments: BreakdownSegment[] = [
    { label: "In-progress", value: inProgress, color: "var(--info)" },
    { label: "Completed", value: completed, color: "var(--ok)" },
    { label: "Rejected", value: rejected, color: "var(--bad)" },
    { label: "Withdrawn", value: withdrawn, color: "var(--ink-4)" },
  ];
  return segments.filter((s) => s.value > 0);
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
      // Completed: status is "Completed" AND we have a Cyber Approval Date in this month.
      if (baseStatus(a.status) === "Completed" && a.cyberApprovalDate && a.cyberApprovalDate >= s && a.cyberApprovalDate <= e) completed++;
      // Rejected: status starts with "Rejected" and the rejection month matches this bucket.
      if (baseStatus(a.status).startsWith("Rejected") && a.monthRejected === key) rejected++;
      // Withdrawn: status starts with "Withdrawn" and dateWithdrawn falls in this month.
      if (baseStatus(a.status).startsWith("Withdrawn") && a.dateWithdrawn && a.dateWithdrawn >= s && a.dateWithdrawn <= e) withdrawn++;
    }
    return { month: key, label, sent, completed, rejected, withdrawn };
  });
}

// ---------- Aging ----------

export function getAgeBuckets(kind: AssessmentKind | "ALL"): AgeBucket[] {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = kind === "ALL" ? [...icaa, ...isa] : kind === "ICAA" ? icaa : isa;
  const inFlight = set.filter((a) => isInProgress(a.kind, a.status));
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
  const overdue = set.filter((a) => isInProgress(a.kind, a.status) && isOverdue(a.status));
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

// ---------- Withdrawn (excluded from billing — shown separately) ----------

export interface WithdrawnStats {
  total: number;
  last30d: number;
  monthly: MonthlyPoint[];
}

export function getWithdrawnStats(kind: AssessmentKind | "ALL", months = 12): WithdrawnStats {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = kind === "ALL" ? [...icaa, ...isa] : kind === "ICAA" ? icaa : isa;
  const withdrawn = set.filter((a) => isWithdrawn(a.status));
  const last30d = withdrawn.filter((a) => a.dateWithdrawn && daysAgo(a.dateWithdrawn) <= 30).length;
  const monthly = lastNMonthKeys(months).map(({ key, label, date }) => {
    const s = startOfMonth(date), e = endOfMonth(date);
    return {
      month: key,
      label,
      value: withdrawn.filter((a) => a.dateWithdrawn && a.dateWithdrawn >= s && a.dateWithdrawn <= e).length,
    };
  });
  return { total: withdrawn.length, last30d, monthly };
}

// ---------- Watchlists ----------

function toWatchlist(a: Assessment, meta: string): WatchlistItem {
  const { people } = getDataset();
  const lookup = new Map(people.map((p) => [p.code, p.name]));
  return {
    id: a.id,
    application: a.applicationName,
    reviewer: a.reviewer,
    reviewerName: a.reviewer ? lookup.get(a.reviewer) ?? a.reviewer : null,
    status: shortStatus(a.status),
    pillVariant: pillVariantFor(a.status),
    meta,
  };
}

export function getOverdueWatchlist(kind: AssessmentKind | "ALL", limit = 10): WatchlistItem[] {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = kind === "ALL" ? [...icaa, ...isa] : kind === "ICAA" ? icaa : isa;
  return set
    .filter((a) => isInProgress(a.kind, a.status) && isOverdue(a.status))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, limit)
    .map((a) => toWatchlist(a, `+${Math.round(a.daysOverdue)}d overdue`));
}

export function getApproachingBreachWatchlist(kind: AssessmentKind | "ALL", limit = 10): WatchlistItem[] {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = kind === "ALL" ? [...icaa, ...isa] : kind === "ICAA" ? icaa : isa;
  return set
    .filter((a) => isInProgress(a.kind, a.status) && !isOverdue(a.status))
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
    .filter((a) => isInProgress(a.kind, a.status) && a.reviewer === null)
    .sort((a, b) => b.daysUnassigned - a.daysUnassigned)
    .slice(0, limit)
    .map((a) => toWatchlist(a, `${Math.round(a.daysUnassigned)}d unassigned`));
}

// ---------- Conversion (ICAA → ISA) ----------

export interface ConversionStats {
  totalIcaa: number;
  completedIcaa: number;
  convertedIcaa: number;
  conversionPct: number;
  monthly: { month: string; label: string; completed: number; converted: number; pct: number }[];
  funnel: FunnelStep[];
  conversionLagDaysMedian: number;
  byRiskCat: { cat: string; completed: number; converted: number; pct: number }[];
}

export function getConversionStats(): ConversionStats {
  const { icaa, isa } = getDataset();

  // "Completed" for conversion analysis = any ICAA past the cyber-approval
  // line: status is Completed, ICAA Archived, or Pending Business Owner
  // Approval (incl. Overdue) — i.e. isCompletedLike("ICAA", status).
  const completed = icaa.filter((a) => isCompletedLike("ICAA", a.status));

  // "Converted" = the source system has registered a child ISA. The
  // authoritative signal is the ICAA's own "ISA Status" field; we also accept
  // the synthetic isaIdLink (from Parent ICAA ID linkage in the seed) as a
  // fallback for completeness.
  const isConverted = (a: IcaaAssessment) =>
    (a.isaStatus !== null && a.isaStatus !== "") || a.isaIdLink !== null;
  const converted = completed.filter(isConverted);

  const monthly = lastNMonthKeys(10).map(({ key, label, date }) => {
    const s = startOfMonth(date), e = endOfMonth(date);
    const finM = completed.filter((a) => a.cyberApprovalDate && a.cyberApprovalDate >= s && a.cyberApprovalDate <= e);
    const convM = finM.filter(isConverted);
    return {
      month: key,
      label,
      completed: finM.length,
      converted: convM.length,
      pct: finM.length > 0 ? Math.round((convM.length / finM.length) * 100) : 0,
    };
  });

  // Funnel — uses real ICAA status milestones, not invented stages.
  const sent = icaa.length;
  const inProgressOrLater = icaa.filter((a) => !baseStatus(a.status).startsWith("Not started")).length;
  const submitted = icaa.filter((a) =>
    !baseStatus(a.status).startsWith("Not started") &&
    !baseStatus(a.status).startsWith("Ready to Submit") &&
    !baseStatus(a.status).startsWith("In-progress with requestor"),
  ).length;
  const inSecurityReview = icaa.filter((a) =>
    baseStatus(a.status).startsWith("Security Validation") ||
    baseStatus(a.status) === "Completed" ||
    baseStatus(a.status).startsWith("Rejected") ||
    baseStatus(a.status) === "ICAA Archived",
  ).length;
  const completedCount = completed.length;
  const convertedCount = converted.length;

  const funnel: FunnelStep[] = [
    { label: "ICAA Sent", value: sent },
    { label: "Requester engaged", value: inProgressOrLater },
    { label: "Submitted to security", value: submitted },
    { label: "In Security Validation", value: inSecurityReview },
    { label: "Completed", value: completedCount },
    { label: "→ Converted to ISA", value: convertedCount },
  ];

  // Conversion lag — days between ICAA completion (cyber approval) and ISA send.
  // Look up the ISA by isaIdLink first (preferred), fall back to Parent ICAA ID.
  const isaById = new Map(isa.map((x) => [x.isaId, x] as const));
  const isaByParent = new Map(isa.filter((x) => x.parentIcaaId).map((x) => [x.parentIcaaId!, x] as const));
  const lags: number[] = [];
  for (const a of converted) {
    const child = (a.isaIdLink && isaById.get(a.isaIdLink)) ?? isaByParent.get(a.id);
    if (!child) continue;
    if (a.cyberApprovalDate && child.dateSent) {
      lags.push(Math.max(0, (child.dateSent.getTime() - a.cyberApprovalDate.getTime()) / DAY));
    }
  }
  const lagMedian = median(lags);

  const cats = ["Low", "Medium", "High", "Critical"] as const;
  const byRiskCat = cats.map((cat) => {
    const finCat = completed.filter((a) => a.inherentRiskCategorization === cat);
    const convCat = finCat.filter(isConverted);
    return {
      cat,
      completed: finCat.length,
      converted: convCat.length,
      pct: finCat.length > 0 ? Math.round((convCat.length / finCat.length) * 100) : 0,
    };
  });

  return {
    totalIcaa: icaa.length,
    completedIcaa: completed.length,
    convertedIcaa: converted.length,
    conversionPct: completed.length > 0 ? (converted.length / completed.length) * 100 : 0,
    monthly,
    funnel,
    conversionLagDaysMedian: lagMedian,
    byRiskCat,
  };
}

// ---------- People / org ----------

// Derive reviewers from the actual dataset, not a static roster — so imported
// Excel exports surface every code that's actually present in the data. The
// static PEOPLE list (from lib/people.ts) is now used only as a friendly-name
// lookup; unknown codes still appear, just with their code as the name.
export function getReviewerLoads(): ReviewerLoad[] {
  const { icaa, isa, people } = getDataset();
  const all: Assessment[] = [...icaa, ...isa];
  const lookup = new Map(people.map((p) => [p.code, p]));

  const codes = new Set<string>();
  for (const a of all) {
    if (a.reviewer) codes.add(a.reviewer);
  }

  return [...codes].map((code) => {
    const mine = all.filter((a) => a.reviewer === code);
    const active = mine.filter((a) => isInProgress(a.kind, a.status)).length;
    const closed30 = mine.filter((a) => a.cyberApprovalDate && daysAgo(a.cyberApprovalDate) <= 30);
    const slaOk = closed30.filter((a) => a.hoursForSbdToReview <= SLA_HOURS[a.kind]).length;
    const avgHours = closed30.length > 0
      ? closed30.reduce((s, a) => s + a.hoursForSbdToReview, 0) / closed30.length
      : 0;

    // Nominal capacity: 8 active assessments per analyst.
    const load = Math.min(100, Math.round((active / 8) * 100));

    const meta = lookup.get(code);
    return {
      code,
      name: meta?.name ?? code,
      role: meta?.role ?? "Reviewer",
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
    if (isInProgress(a.kind, a.status)) cur.inFlight++;
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
  const completed = isa.filter((a) => baseStatus(a.status) === "Completed");
  if (completed.length === 0) {
    return { avgInitial: 0, avgCurrent: 0, avgImprovement: 0, byLevel: [] };
  }
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const avgInitial = avg(completed.map((a) => a.initialDesignScore));
  const avgCurrent = avg(completed.map((a) => a.currentDesignScore));
  const levels = ["L1", "L2", "L3"];
  const byLevel = levels.map((level) => {
    const sub = completed.filter((a) => a.isaLevel === level);
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
      // In flight = no closure (cyber approval or withdrawal) on or before this day.
      if (a.cyberApprovalDate && a.cyberApprovalDate <= day) return false;
      if (a.dateWithdrawn && a.dateWithdrawn <= day) return false;
      return true;
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
  // Only fully completed records have meaningful time-in-stage values.
  const closed = set.filter((a) => baseStatus(a.status) === "Completed");
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
  // Multi-value filters (URL: comma-joined). When set, only rows matching
  // any value in the list pass.
  statusIn?: string[];
  reviewerIn?: string[];
  riskCatIn?: string[];
  // Single-value filters
  status?: string;
  reviewer?: string;
  riskCat?: string;
  overdueOnly?: boolean;
  inFlightOnly?: boolean;
  search?: string;
  // Sort
  sortKey?: string;             // column key (one of the AssessmentTable sortable keys)
  sortDir?: "asc" | "desc";
}

export interface ListResult {
  rows: Assessment[];
  total: number;
}

type AssessmentSortKey =
  | "id"
  | "applicationName"
  | "reviewer"
  | "inherentRiskCategorization"
  | "hoursForSbdToReview"
  | "status"
  | "dateSent"
  | "dateDue";

const RISK_RANK: Record<string, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };

function getSortValue(a: Assessment, key: AssessmentSortKey): string | number | Date {
  switch (key) {
    case "id": return a.id;
    case "applicationName": return a.applicationName;
    case "reviewer": return a.reviewer ?? "";
    case "inherentRiskCategorization": return RISK_RANK[a.inherentRiskCategorization] ?? 0;
    case "hoursForSbdToReview": return a.hoursForSbdToReview / SLA_HOURS[a.kind];
    case "status": return shortStatus(a.status);
    case "dateSent": return a.dateSent;
    case "dateDue": return a.dateDue;
  }
}

function compareSort(a: string | number | Date, b: string | number | Date): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function listAssessments(filters: ListFilters, page = 1, pageSize = 25): ListResult {
  const { icaa, isa } = getDataset();
  const set: Assessment[] = filters.kind === "ICAA" ? icaa : isa;

  const statusSet = filters.statusIn && filters.statusIn.length > 0 ? new Set(filters.statusIn) : null;
  const reviewerSet = filters.reviewerIn && filters.reviewerIn.length > 0 ? new Set(filters.reviewerIn) : null;
  const riskSet = filters.riskCatIn && filters.riskCatIn.length > 0 ? new Set(filters.riskCatIn) : null;

  const filtered = set.filter((a) => {
    if (filters.status && a.status !== filters.status) return false;
    if (filters.reviewer && a.reviewer !== filters.reviewer) return false;
    if (filters.riskCat && a.inherentRiskCategorization !== filters.riskCat) return false;
    if (statusSet && !statusSet.has(a.status)) return false;
    if (reviewerSet && !reviewerSet.has(a.reviewer ?? "(unassigned)")) return false;
    if (riskSet && !riskSet.has(a.inherentRiskCategorization)) return false;
    if (filters.overdueOnly && !isOverdue(a.status)) return false;
    if (filters.inFlightOnly && isTerminal(a.kind, a.status)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!a.applicationName.toLowerCase().includes(q) && !a.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (filters.sortKey) {
    const key = filters.sortKey as AssessmentSortKey;
    const dir = filters.sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => compareSort(getSortValue(a, key), getSortValue(b, key)) * dir);
  } else {
    // Default: in-flight first (overdue, then oldest); terminal by most recent
    // cyber approval (or dateSent if not approved).
    filtered.sort((a, b) => {
      const aDone = isTerminal(a.kind, a.status), bDone = isTerminal(b.kind, b.status);
      if (aDone !== bDone) return aDone ? 1 : -1;
      if (!aDone) {
        const aO = isOverdue(a.status) ? 1 : 0;
        const bO = isOverdue(b.status) ? 1 : 0;
        if (aO !== bO) return bO - aO;
        return a.dateSent.getTime() - b.dateSent.getTime();
      }
      const aT = a.cyberApprovalDate?.getTime() ?? a.dateSent.getTime();
      const bT = b.cyberApprovalDate?.getTime() ?? b.dateSent.getTime();
      return bT - aT;
    });
  }

  const start = (page - 1) * pageSize;
  return { rows: filtered.slice(start, start + pageSize), total: filtered.length };
}
