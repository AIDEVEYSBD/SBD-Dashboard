import { Card } from "@/components/Card";
import { SectionHead } from "@/components/SectionHead";
import { Topbar } from "@/components/Topbar";
import { Watchlist } from "@/components/Watchlist";
import {
  getAgeBuckets,
  getApproachingBreachWatchlist,
  getDaysOverdueDistribution,
  getOverdueWatchlist,
  getStaleUnassigned,
} from "@/lib/queries";

function BarRows({
  rows,
  colorFor,
}: {
  rows: { label: string; count: number }[];
  colorFor: (label: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "grid", gridTemplateColumns: "70px 1fr 80px", gap: 12, alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{r.label}</span>
          <div style={{ height: 10, background: "var(--bg-3)", borderRadius: 999 }}>
            <div style={{ height: "100%", width: `${(r.count / max) * 100}%`, background: colorFor(r.label), borderRadius: 999 }} />
          </div>
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-2)", textAlign: "right" }}>
            {r.count.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AgingPage() {
  const ageAll = getAgeBuckets("ALL");
  const ageIcaa = getAgeBuckets("ICAA");
  const ageIsa = getAgeBuckets("ISA");
  const overdueAll = getDaysOverdueDistribution("ALL");
  const overdueIcaa = getDaysOverdueDistribution("ICAA");
  const overdueIsa = getDaysOverdueDistribution("ISA");
  const overdueList = getOverdueWatchlist("ALL", 15);
  const approaching = getApproachingBreachWatchlist("ALL", 15);
  const stale = getStaleUnassigned(15);

  const ageColor = (label: string) =>
    label === "60+d" ? "var(--bad)" : label === "31–60d" ? "var(--warn)" : label === "15–30d" ? "var(--accent)" : "var(--info)";
  const overdueColor = (label: string) =>
    label === "30+d" ? "var(--bad)" : label === "15–30d" ? "var(--bad)" : label === "8–14d" ? "var(--warn)" : "var(--accent)";

  return (
    <>
      <Topbar section="Aging & SLA" />
      <div className="page">
        <SectionHead
          eyebrow="Aging"
          title={<>How <em>old</em> is the backlog?</>}
          sub="In-flight assessments by days since Date Sent. The 60+ day tail is where escalations live."
        />

        <div className="grid-3">
          <Card title="Combined" sub="ICAA + ISA in flight."><BarRows rows={ageAll} colorFor={ageColor} /></Card>
          <Card title="ICAA"><BarRows rows={ageIcaa} colorFor={ageColor} /></Card>
          <Card title="ISA"><BarRows rows={ageIsa} colorFor={ageColor} /></Card>
        </div>

        <SectionHead
          eyebrow="Overdue depth"
          title={<>How <em>far</em> past SLA?</>}
          sub="Days overdue distribution. The further right, the more painful the conversation."
        />

        <div className="grid-3">
          <Card title="Combined"><BarRows rows={overdueAll} colorFor={overdueColor} /></Card>
          <Card title="ICAA"><BarRows rows={overdueIcaa} colorFor={overdueColor} /></Card>
          <Card title="ISA"><BarRows rows={overdueIsa} colorFor={overdueColor} /></Card>
        </div>

        <SectionHead
          eyebrow="Action lists"
          title={<>What needs <em>moving</em></>}
          sub="The longest queues, sorted by urgency. Open in the relevant kind tab to act."
        />

        <Card title="Most overdue — across both kinds" sub="Top 15 by Days Overdue." tight>
          <Watchlist items={overdueList} emptyMessage="Nothing overdue." />
        </Card>

        <div className="grid-2">
          <Card title="Approaching breach" sub="≥60% of SLA hours used, not yet overdue. Top 15." tight>
            <Watchlist items={approaching} />
          </Card>
          <Card title="Unassigned & aging" sub="In-flight without a reviewer assigned. Top 15." tight>
            <Watchlist items={stale} emptyMessage="Everything assigned." />
          </Card>
        </div>
      </div>
    </>
  );
}
