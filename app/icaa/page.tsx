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
import {
  getAiStats,
  getCriticalityBreakdown,
  getDailyInFlight,
  getGeographyBreakdown,
  getHostingBreakdown,
  getInfoClassBreakdown,
  getKindKpis,
  getMonthlyVolume,
  getRiskBreakdown,
  getStatusBreakdown,
  getStatusRows,
  getTimeInStage,
  getWipMonthly,
  listAssessments,
} from "@/lib/queries";

export default async function IcaaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; risk?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view ?? "in-flight";
  const risk = sp.risk ?? "Any";
  const q = sp.q ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 25;

  const kpis = getKindKpis("ICAA");
  const trend = getDailyInFlight("ICAA", 30);
  const status = getStatusBreakdown("ICAA");
  const statusRows = getStatusRows("ICAA");
  const monthly = getMonthlyVolume("ICAA", 12);
  const risks = getRiskBreakdown("ICAA");
  const infoClass = getInfoClassBreakdown("ICAA");
  const criticality = getCriticalityBreakdown("ICAA");
  const hosting = getHostingBreakdown("ICAA");
  const geo = getGeographyBreakdown();
  const timeInStage = getTimeInStage("ICAA");
  const wip = getWipMonthly("ICAA", 12);
  const ai = getAiStats();

  const list = listAssessments(
    {
      kind: "ICAA",
      overdueOnly: view === "overdue",
      inFlightOnly: view !== "any",
      riskCat: risk === "Any" ? undefined : risk,
      search: q || undefined,
    },
    page,
    pageSize,
  );

  return (
    <>
      <Topbar section="ICAA" />
      <div className="page">
        <SectionHead
          eyebrow="ICAA — Information Classification & Criticality"
          title={<>Triage <em>throughput</em></>}
          sub="The intake assessment that establishes app classification. SLA: 24 SBD hours."
        />

        <KpiStripClient tiles={kpis} />

        <div className="grid-2-1">
          <Card title="In-flight ICAAs — last 30 days" sub="Daily count.">
            <TrendChartClient data={trend} height={220} />
          </Card>
          <Card title="Where the hours go" sub="Mean time-in-stage for completed ICAAs.">
            <TimeInStageBars rows={timeInStage} />
          </Card>
        </div>

        <Card title="Status breakdown" sub="Lifecycle buckets across every active and terminal ICAA.">
          <StackBar segments={status} />
        </Card>

        <div className="grid-2">
          <Card title="Status — full taxonomy" sub="All 16 ICAA statuses, with overdue split." tight>
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

        <Card title="WIP at month-end" sub="Stock count of in-flight ICAAs at the end of each month — backlog over time.">
          <TrendChartClient data={wip} height={200} />
        </Card>

        <SectionHead
          eyebrow="Classification"
          title={<>What we're <em>classifying</em></>}
          sub="The shape of the inbound pipeline by risk, sensitivity, and geography."
        />

        <div className="grid-3">
          <Card title="Inherent risk" sub="Categorization at intake."><StackBar segments={risks} /></Card>
          <Card title="Information classification"><StackBar segments={infoClass} /></Card>
          <Card title="Service criticality"><StackBar segments={criticality} /></Card>
        </div>

        <div className="grid-2">
          <Card title="Hosting type"><StackBar segments={hosting} /></Card>
          <Card title="Geography (ICAA only)"><StackBar segments={geo} /></Card>
        </div>

        <SectionHead
          eyebrow="AI signal"
          title={<>Q18 — <em>AI involvement</em></>}
          sub="ICAAs flagging AI involvement (Q18 = Yes) and how often they progress to ISA."
        />

        <div className="grid-3">
          <Card title="AI-flagged ICAAs">
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "var(--s-4) 0" }}>
              <Ring value={ai.pct} size={140} color="var(--accent-2)" label="of ICAAs" />
            </div>
            <div className="mono" style={{ fontSize: 12, textAlign: "center", color: "var(--ink-3)" }}>
              {ai.aiFlagged.toLocaleString()} of {ai.totalIcaa.toLocaleString()}
            </div>
          </Card>
          <Card title="AI ICAAs by month" sub="Inbound volume of AI-flagged ICAAs.">
            <TrendChartClient
              data={ai.monthly.map((m) => ({ label: m.label, value: m.value }))}
              height={180}
              color="var(--accent-2)"
            />
          </Card>
          <Card title="AI → ISA conversion">
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "var(--s-4) 0" }}>
              <Ring value={ai.aiConversionPct} size={140} color="var(--accent)" label="converted" />
            </div>
            <div className="mono" style={{ fontSize: 12, textAlign: "center", color: "var(--ink-3)" }}>
              {ai.aiConverted.toLocaleString()} of {ai.aiFlagged.toLocaleString()} AI ICAAs
            </div>
          </Card>
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
          <AssessmentTable rows={list.rows} kind="ICAA" />
          <Pagination page={page} total={list.total} pageSize={pageSize} />
        </Card>
      </div>
    </>
  );
}
