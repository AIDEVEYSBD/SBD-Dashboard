import { AssessmentTable } from "@/components/AssessmentTable";
import { Card } from "@/components/Card";
import { KindFilters } from "@/components/KindFilters";
import { KpiStripClient } from "@/components/KpiStripClient";
import { Pagination } from "@/components/Pagination";
import { Ring } from "@/components/Ring";
import { SectionHead } from "@/components/SectionHead";
import { StackBar } from "@/components/StackBar";
import { StatusTable } from "@/components/StatusTable";
import { StackedBarChart } from "@/components/Chart";
import { TimeInStageBars } from "@/components/TimeInStageBars";
import { Topbar } from "@/components/Topbar";
import { TrendChartClient } from "@/components/TrendChartClient";
import { WithdrawnNote } from "@/components/WithdrawnNote";
import {
  getCriticalityBreakdown,
  getDailyInFlight,
  getDesignScoreStats,
  getHostingBreakdown,
  getInfoClassBreakdown,
  getKindKpis,
  getMonthlyVolume,
  getRiskBreakdown,
  getStatusBreakdown,
  getStatusRows,
  getTimeInStage,
  getWipMonthly,
  getWithdrawnStats,
  listAssessments,
} from "@/lib/queries";

export default async function IsaPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    risk?: string;
    q?: string;
    page?: string;
    sortKey?: string;
    sortDir?: string;
    statusIn?: string;
    reviewerIn?: string;
    riskIn?: string;
  }>;
}) {
  const sp = await searchParams;
  const view = sp.view ?? "in-flight";
  const risk = sp.risk ?? "Any";
  const q = sp.q ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 25;
  const sortKey = sp.sortKey;
  const sortDir = sp.sortDir === "asc" ? "asc" : sp.sortDir === "desc" ? "desc" : undefined;
  const statusIn = sp.statusIn ? sp.statusIn.split(",").filter(Boolean) : undefined;
  const reviewerIn = sp.reviewerIn ? sp.reviewerIn.split(",").filter(Boolean) : undefined;
  const riskIn = sp.riskIn ? sp.riskIn.split(",").filter(Boolean) : undefined;

  const kpis = getKindKpis("ISA");
  const trend = getDailyInFlight("ISA", 30);
  const status = getStatusBreakdown("ISA");
  const statusRows = getStatusRows("ISA");
  const monthly = getMonthlyVolume("ISA", 12);
  const risks = getRiskBreakdown("ISA");
  const infoClass = getInfoClassBreakdown("ISA");
  const criticality = getCriticalityBreakdown("ISA");
  const hosting = getHostingBreakdown("ISA");
  const timeInStage = getTimeInStage("ISA");
  const wip = getWipMonthly("ISA", 12);
  const withdrawn = getWithdrawnStats("ISA");
  const design = getDesignScoreStats();

  const list = listAssessments(
    {
      kind: "ISA",
      overdueOnly: view === "overdue",
      inFlightOnly: view !== "any",
      riskCat: risk === "Any" ? undefined : risk,
      search: q || undefined,
      sortKey,
      sortDir,
      statusIn,
      reviewerIn,
      riskCatIn: riskIn,
    },
    page,
    pageSize,
  );

  return (
    <>
      <Topbar section="ISA" />
      <div className="page">
        <SectionHead
          eyebrow="ISA — Information Security Assessment"
          title={<>Deep <em>review</em></>}
          sub="The control-focused assessment performed for ICAA-graduated apps. SLA: 120 SBD hours."
        />

        <KpiStripClient tiles={kpis} />

        <WithdrawnNote stats={withdrawn} kind="ISA" />

        <div className="grid-2-1">
          <Card title="In-flight ISAs — last 30 days" sub="Daily count.">
            <TrendChartClient data={trend} height={220} />
          </Card>
          <Card title="Where the hours go" sub="Mean time-in-stage for completed ISAs.">
            <TimeInStageBars rows={timeInStage} />
          </Card>
        </div>

        <Card title="Status breakdown" sub="Lifecycle buckets across every active and terminal ISA.">
          <StackBar segments={status} />
        </Card>

        <div className="grid-2">
          <Card title="Status — full taxonomy" sub="All 16 ISA statuses, with overdue split." tight>
            <StatusTable rows={statusRows} />
          </Card>
          <Card title="Monthly volume" sub="Sent / completed / rejected / withdrawn — last 12 months.">
            <StackedBarChart
              labels={monthly.map((m) => m.label)}
              series={[
                { label: "Sent", values: monthly.map((m) => m.sent), color: "var(--ink-5)" },
                { label: "Completed", values: monthly.map((m) => m.completed), color: "var(--ok)" },
                { label: "Rejected", values: monthly.map((m) => m.rejected), color: "var(--bad)" },
                { label: "Withdrawn", values: monthly.map((m) => m.withdrawn), color: "var(--ink-4)" },
              ]}
              height={220}
            />
          </Card>
        </div>

        <Card title="WIP at month-end" sub="Stock count of in-flight ISAs at the end of each month — backlog over time.">
          <TrendChartClient data={wip} height={200} />
        </Card>

        <SectionHead
          eyebrow="Classification"
          title={<>Risk <em>shape</em></>}
          sub="What the ISA backlog looks like by risk, sensitivity, and how it's hosted."
        />

        <div className="grid-3">
          <Card title="Inherent risk"><StackBar segments={risks} /></Card>
          <Card title="Information classification"><StackBar segments={infoClass} /></Card>
          <Card title="Service criticality"><StackBar segments={criticality} /></Card>
        </div>

        <Card title="Hosting type"><StackBar segments={hosting} /></Card>

        <SectionHead
          eyebrow="Design effectiveness"
          title={<>Score <em>uplift</em></>}
          sub="Initial design score vs. current design score — does the ISA process actually move the needle?"
        />

        <div className="grid-3">
          <Card title="Average improvement" sub="Across all completed ISAs.">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", padding: "var(--s-4) 0" }}>
              <div className="kpi-value tnum">+{design.avgImprovement.toFixed(1)}<span className="unit">pts</span></div>
              <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
                {design.avgInitial.toFixed(0)} → {design.avgCurrent.toFixed(0)}
              </div>
            </div>
          </Card>
          {design.byLevel.map((l) => (
            <Card key={l.level} title={`Level ${l.level}`} sub={`n = ${l.n.toLocaleString()}`}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <Ring value={l.current} size={100} color="var(--ok)" label="current" />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Initial: <span className="mono" style={{ color: "var(--ink-2)" }}>{l.initial.toFixed(0)}</span></div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Current: <span className="mono" style={{ color: "var(--ink)" }}>{l.current.toFixed(0)}</span></div>
                  <div style={{ fontSize: 12, color: "var(--ok)" }}>Δ <span className="mono">+{(l.current - l.initial).toFixed(1)}</span></div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <SectionHead
          eyebrow="Records"
          title={<>The <em>working list</em></>}
          sub={`${list.total.toLocaleString()} match — sorted by overdue first, then oldest in flight.`}
        />

        <Card tight>
          <div style={{ padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--line)" }}>
            <KindFilters
              currentView={view as "in-flight" | "overdue" | "any"}
              currentRisk={risk}
              currentSearch={q}
            />
          </div>
          <AssessmentTable rows={list.rows} kind="ISA" />
          <Pagination page={page} total={list.total} pageSize={pageSize} />
        </Card>
      </div>
    </>
  );
}
