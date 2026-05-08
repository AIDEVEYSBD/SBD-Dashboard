import { Card } from "@/components/Card";
import { GreetingHeadline, GreetingSub } from "@/components/Greeting";
import { KpiStripClient } from "@/components/KpiStripClient";
import { SectionHead } from "@/components/SectionHead";
import { StackBar } from "@/components/StackBar";
import { TrendChartClient } from "@/components/TrendChartClient";
import { Topbar } from "@/components/Topbar";
import { Watchlist } from "@/components/Watchlist";
import { StackedBarChart } from "@/components/Chart";
import { WithdrawnNote } from "@/components/WithdrawnNote";
import {
  getOverviewKpis,
  getStatusBreakdown,
  getMonthlyVolume,
  getAgeBuckets,
  getOverdueWatchlist,
  getApproachingBreachWatchlist,
  getStaleUnassigned,
  getDailyInFlight,
  getWithdrawnStats,
} from "@/lib/queries";

export default function OverviewPage() {
  const kpis = getOverviewKpis();
  const icaaStatus = getStatusBreakdown("ICAA");
  const isaStatus = getStatusBreakdown("ISA");
  const monthlyAll = getMonthlyVolume("ALL", 12);
  const ageAll = getAgeBuckets("ALL");
  const overdue = getOverdueWatchlist("ALL", 8);
  const approaching = getApproachingBreachWatchlist("ALL", 8);
  const stale = getStaleUnassigned(6);
  const trend = getDailyInFlight("ALL", 30);
  const withdrawn = getWithdrawnStats("ALL");

  const ageMax = Math.max(1, ...ageAll.map((b) => b.count));

  return (
    <>
      <Topbar section="Dashboard" />
      <div className="page">
        <SectionHead
          eyebrow="01 — Snapshot"
          title={<GreetingHeadline />}
          sub={<GreetingSub />}
        />

        <KpiStripClient tiles={kpis} />

        <WithdrawnNote stats={withdrawn} kind="ALL" />

        <div className="grid-2-1">
          <Card title="In-flight assessments — last 30 days" sub="Daily count across ICAA and ISA combined.">
            <TrendChartClient data={trend} height={220} />
          </Card>
          <Card title="Aging — in-flight" sub="Days since Date Sent.">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ageAll.map((b) => (
                <div key={b.label} style={{ display: "grid", gridTemplateColumns: "60px 1fr 60px", gap: 12, alignItems: "center" }}>
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{b.label}</span>
                  <div style={{ height: 8, background: "var(--bg-3)", borderRadius: 999 }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(b.count / ageMax) * 100}%`,
                        background: b.label === "60+d" ? "var(--bad)" : b.label === "31–60d" ? "var(--warn)" : "var(--accent)",
                        borderRadius: 999,
                      }}
                    />
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)", textAlign: "right" }}>
                    {b.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid-2">
          <Card title="ICAA — status breakdown" sub="Lifecycle buckets. Overdue is encoded into the underlying status.">
            <StackBar segments={icaaStatus} />
          </Card>
          <Card title="ISA — status breakdown" sub="Lifecycle buckets. Overdue is encoded into the underlying status.">
            <StackBar segments={isaStatus} />
          </Card>
        </div>

        <Card
          title="Monthly volume — last 12 months"
          sub="Sent / completed / rejected / withdrawn. Both assessment types combined."
        >
          <StackedBarChart
            labels={monthlyAll.map((m) => m.label)}
            series={[
              { label: "Sent", values: monthlyAll.map((m) => m.sent), color: "var(--ink-5)" },
              { label: "Completed", values: monthlyAll.map((m) => m.completed), color: "var(--ok)" },
              { label: "Rejected", values: monthlyAll.map((m) => m.rejected), color: "var(--bad)" },
              { label: "Withdrawn", values: monthlyAll.map((m) => m.withdrawn), color: "var(--ink-4)" },
            ]}
            height={220}
          />
        </Card>

        <SectionHead
          eyebrow="02 — Action lists"
          title={<>Today's <em>shortlist</em></>}
          sub="The four lists most worth opening. Tap any row to drill into the assessment."
        />

        <div className="grid-2">
          <Card title="Overdue" sub="In-flight assessments past their SLA target." tight>
            <Watchlist items={overdue} emptyMessage="No overdue assessments — nice." />
          </Card>
          <Card title="Approaching breach" sub="≥60% of SLA hours used, not yet overdue." tight>
            <Watchlist items={approaching} />
          </Card>
        </div>

        <div className="grid-2">
          <Card title="Stale & unassigned" sub="In-flight without a reviewer assigned." tight>
            <Watchlist items={stale} emptyMessage="Everything has a reviewer." />
          </Card>
          <div />
        </div>
      </div>
    </>
  );
}
