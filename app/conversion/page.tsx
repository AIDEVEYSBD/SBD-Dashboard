import { Card } from "@/components/Card";
import { Funnel } from "@/components/Funnel";
import { Ring } from "@/components/Ring";
import { SectionHead } from "@/components/SectionHead";
import { StackedBarChart } from "@/components/Chart";
import { Topbar } from "@/components/Topbar";
import { TrendChartClient } from "@/components/TrendChartClient";
import { getConversionStats } from "@/lib/queries";

export default function ConversionPage() {
  const stats = getConversionStats();

  return (
    <>
      <Topbar section="Conversion" />
      <div className="page">
        <SectionHead
          eyebrow="ICAA → ISA"
          title={<>Triage to <em>deep review</em></>}
          sub="What share of finalized ICAAs are escalated to a full ISA — and how long the handoff takes."
        />

        <div className="grid-3">
          <Card title="Conversion rate" sub="Finalized ICAAs that have a linked ISA.">
            <div style={{ display: "flex", justifyContent: "center", padding: "var(--s-3) 0" }}>
              <Ring value={stats.conversionPct} size={160} color="var(--accent)" label="converted" />
            </div>
            <div className="mono" style={{ fontSize: 12, textAlign: "center", color: "var(--ink-3)" }}>
              {stats.convertedIcaa.toLocaleString()} of {stats.finalizedIcaa.toLocaleString()} finalized
            </div>
          </Card>
          <Card title="Median conversion lag" sub="Days between ICAA finalize and ISA send.">
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "var(--s-7) 0" }}>
              <div style={{ textAlign: "center" }}>
                <div className="kpi-value tnum">{stats.conversionLagDaysMedian.toFixed(1)}<span className="unit">d</span></div>
                <div className="eyebrow" style={{ marginTop: 8 }}>Median across converted</div>
              </div>
            </div>
          </Card>
          <Card title="Total volume" sub="Across the full ICAA backlog.">
            <div style={{ display: "flex", justifyContent: "space-around", padding: "var(--s-4) 0" }}>
              <div style={{ textAlign: "center" }}>
                <div className="kpi-value tnum">{stats.totalIcaa.toLocaleString()}</div>
                <div className="eyebrow" style={{ marginTop: 6 }}>All ICAAs</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="kpi-value tnum">{stats.finalizedIcaa.toLocaleString()}</div>
                <div className="eyebrow" style={{ marginTop: 6 }}>Finalized</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div className="kpi-value tnum" style={{ color: "var(--accent)" }}>{stats.convertedIcaa.toLocaleString()}</div>
                <div className="eyebrow" style={{ marginTop: 6 }}>Converted</div>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Pipeline funnel" sub="ICAA Sent → … → Converted to ISA. Drop-off at each stage.">
          <Funnel steps={stats.funnel} />
        </Card>

        <div className="grid-2">
          <Card title="Conversion by month" sub="Finalized ICAAs and the ones that converted.">
            <StackedBarChart
              labels={stats.monthly.map((m) => m.label)}
              series={[
                { label: "Finalized (no ISA)", values: stats.monthly.map((m) => m.finalized - m.converted), color: "var(--ink-5)" },
                { label: "Converted to ISA", values: stats.monthly.map((m) => m.converted), color: "var(--accent)" },
              ]}
              height={220}
            />
          </Card>
          <Card title="Conversion rate %" sub="Per-month conversion ratio.">
            <TrendChartClient
              data={stats.monthly.map((m) => ({ label: m.label, value: m.pct }))}
              height={220}
              color="var(--accent)"
            />
          </Card>
        </div>

        <Card title="Conversion by inherent risk" sub="Higher-risk ICAAs should convert more often. Sanity check the triage rule.">
          <table className="table">
            <thead>
              <tr>
                <th>Risk category</th>
                <th style={{ textAlign: "right" }}>Finalized</th>
                <th style={{ textAlign: "right" }}>Converted</th>
                <th style={{ textAlign: "right" }}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.byRiskCat.map((r) => (
                <tr key={r.cat}>
                  <td>{r.cat}</td>
                  <td className="num" style={{ textAlign: "right" }}>{r.finalized.toLocaleString()}</td>
                  <td className="num" style={{ textAlign: "right" }}>{r.converted.toLocaleString()}</td>
                  <td className="num" style={{ textAlign: "right", color: r.pct >= 50 ? "var(--accent)" : "var(--ink-2)" }}>
                    {r.pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
