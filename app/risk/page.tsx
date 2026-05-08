import { Card } from "@/components/Card";
import { Ring } from "@/components/Ring";
import { SectionHead } from "@/components/SectionHead";
import { StackBar } from "@/components/StackBar";
import { Topbar } from "@/components/Topbar";
import {
  getCriticalityBreakdown,
  getDesignScoreStats,
  getGeographyBreakdown,
  getHostingBreakdown,
  getInfoClassBreakdown,
  getRiskBreakdown,
} from "@/lib/queries";

export default function RiskPage() {
  const icaaRisk = getRiskBreakdown("ICAA");
  const isaRisk = getRiskBreakdown("ISA");
  const icaaInfo = getInfoClassBreakdown("ICAA");
  const isaInfo = getInfoClassBreakdown("ISA");
  const icaaCrit = getCriticalityBreakdown("ICAA");
  const isaCrit = getCriticalityBreakdown("ISA");
  const icaaHost = getHostingBreakdown("ICAA");
  const isaHost = getHostingBreakdown("ISA");
  const geo = getGeographyBreakdown();
  const design = getDesignScoreStats();

  return (
    <>
      <Topbar section="Risk" />
      <div className="page">
        <SectionHead
          eyebrow="Portfolio shape"
          title={<>The <em>risk landscape</em></>}
          sub="Read-only views — compliance reporting is out of scope. This is for situational awareness across the portfolio."
        />

        <div className="grid-2">
          <Card title="Inherent risk — ICAA" sub="At intake."><StackBar segments={icaaRisk} /></Card>
          <Card title="Inherent risk — ISA" sub="At deep review."><StackBar segments={isaRisk} /></Card>
        </div>

        <div className="grid-2">
          <Card title="Information classification — ICAA"><StackBar segments={icaaInfo} /></Card>
          <Card title="Information classification — ISA"><StackBar segments={isaInfo} /></Card>
        </div>

        <div className="grid-2">
          <Card title="Service criticality — ICAA"><StackBar segments={icaaCrit} /></Card>
          <Card title="Service criticality — ISA"><StackBar segments={isaCrit} /></Card>
        </div>

        <div className="grid-2">
          <Card title="Hosting — ICAA" sub='From "Hosting Type New" column.'><StackBar segments={icaaHost} /></Card>
          <Card title="Hosting — ISA"><StackBar segments={isaHost} /></Card>
        </div>

        <Card title="Geography (ICAA only)" sub="ISA records don't carry a geography field.">
          <StackBar segments={geo} />
        </Card>

        <SectionHead
          eyebrow="ISA design score"
          title={<>Design effectiveness, <em>before vs. after</em></>}
          sub="Initial vs. current design score across completed ISAs. Reported per ISA level."
        />

        <div className="grid-3">
          <Card title="Average improvement" sub="All completed ISAs.">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", padding: "var(--s-4) 0" }}>
              <div className="kpi-value tnum" style={{ color: "var(--ok)" }}>+{design.avgImprovement.toFixed(1)}<span className="unit">pts</span></div>
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
      </div>
    </>
  );
}
