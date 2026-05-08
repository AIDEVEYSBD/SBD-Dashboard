import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Progress } from "@/components/Progress";
import { SectionHead } from "@/components/SectionHead";
import { Topbar } from "@/components/Topbar";
import {
  getOrgBreakdown,
  getReviewerLoads,
  getTopRequesters,
} from "@/lib/queries";

export default function PeoplePage() {
  const reviewers = getReviewerLoads();
  const vpOrgs = getOrgBreakdown("serviceVpOrg");
  const dirOrgs = getOrgBreakdown("serviceDirectorOrg");
  const requesters = getTopRequesters(12);

  return (
    <>
      <Topbar section="People" />
      <div className="page">
        <SectionHead
          eyebrow="Team load"
          title={<>Who's <em>carrying</em> what</>}
          sub="Active count, recent throughput, and SLA compliance per reviewer. One analyst per assessment ideally."
        />

        <Card tight>
          <table className="table">
            <thead>
              <tr>
                <th>Reviewer</th>
                <th>Role</th>
                <th style={{ textAlign: "right" }}>Active</th>
                <th style={{ textAlign: "right" }}>Closed (30d)</th>
                <th style={{ textAlign: "right" }}>Avg SBD hrs</th>
                <th style={{ textAlign: "right" }}>SLA %</th>
                <th style={{ width: 200 }}>Load</th>
              </tr>
            </thead>
            <tbody>
              {reviewers.map((r) => {
                const slaVariant: "ok" | "warn" | "bad" =
                  r.slaPct >= 90 ? "ok" : r.slaPct >= 70 ? "warn" : "bad";
                const loadVariant: "ok" | "warn" | "bad" | "accent" =
                  r.load > 100 ? "bad" : r.load > 85 ? "warn" : "accent";
                return (
                  <tr key={r.code}>
                    <td>
                      <span className="who">
                        <Avatar code={r.code} title={r.name} />
                        <span style={{ fontWeight: 500 }}>{r.name}</span>
                      </span>
                    </td>
                    <td className="muted">{r.role}</td>
                    <td className="num" style={{ textAlign: "right" }}>{r.active.toLocaleString()}</td>
                    <td className="num" style={{ textAlign: "right" }}>{r.closed30d.toLocaleString()}</td>
                    <td className="num" style={{ textAlign: "right" }}>{r.avgSbdHours.toFixed(1)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Pill variant={slaVariant}>{r.slaPct}%</Pill>
                    </td>
                    <td>
                      <Progress value={Math.min(100, r.load)} variant={loadVariant} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <SectionHead
          eyebrow="Demand"
          title={<>Where the work <em>comes from</em></>}
          sub="Volume by VP and Director org, and the requesters submitting the most ICAAs."
        />

        <div className="grid-2">
          <Card title="By Service VP Org" sub="Top of the org tree." tight>
            <table className="table">
              <thead>
                <tr>
                  <th>Org</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "right" }}>In flight</th>
                  <th style={{ textAlign: "right" }}>Overdue</th>
                </tr>
              </thead>
              <tbody>
                {vpOrgs.map((o) => (
                  <tr key={o.org}>
                    <td>{o.org}</td>
                    <td className="num" style={{ textAlign: "right" }}>{o.total.toLocaleString()}</td>
                    <td className="num" style={{ textAlign: "right" }}>{o.inFlight.toLocaleString()}</td>
                    <td className="num" style={{ textAlign: "right", color: o.overdue > 0 ? "var(--bad)" : "var(--ink-3)" }}>
                      {o.overdue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="By Service Director Org" tight>
            <table className="table">
              <thead>
                <tr>
                  <th>Org</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "right" }}>In flight</th>
                  <th style={{ textAlign: "right" }}>Overdue</th>
                </tr>
              </thead>
              <tbody>
                {dirOrgs.map((o) => (
                  <tr key={o.org}>
                    <td>{o.org}</td>
                    <td className="num" style={{ textAlign: "right" }}>{o.total.toLocaleString()}</td>
                    <td className="num" style={{ textAlign: "right" }}>{o.inFlight.toLocaleString()}</td>
                    <td className="num" style={{ textAlign: "right", color: o.overdue > 0 ? "var(--bad)" : "var(--ink-3)" }}>
                      {o.overdue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <Card title="Top requesters" sub="Most-frequent ICAA submitters. Rejection ratio flags low-quality submissions." tight>
          <table className="table">
            <thead>
              <tr>
                <th>Requester</th>
                <th style={{ textAlign: "right" }}>Submitted</th>
                <th style={{ textAlign: "right" }}>Rejected ratio</th>
              </tr>
            </thead>
            <tbody>
              {requesters.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td className="num" style={{ textAlign: "right" }}>{r.total.toLocaleString()}</td>
                  <td className="num" style={{ textAlign: "right", color: r.rejectedRatio > 0.1 ? "var(--bad)" : "var(--ink-2)" }}>
                    {(r.rejectedRatio * 100).toFixed(1)}%
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
