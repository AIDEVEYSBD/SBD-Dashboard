import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { Progress } from "@/components/Progress";
import { SectionHead } from "@/components/SectionHead";
import { SortableTable, type SortableColumn } from "@/components/SortableTable";
import { Topbar } from "@/components/Topbar";
import {
  getOrgBreakdown,
  getReviewerLoads,
  getTopRequesters,
} from "@/lib/queries";
import type { OrgRow, ReviewerLoad } from "@/lib/types";

export default function PeoplePage() {
  const reviewers = getReviewerLoads();
  const vpOrgs = getOrgBreakdown("serviceVpOrg");
  const dirOrgs = getOrgBreakdown("serviceDirectorOrg");
  const requesters = getTopRequesters(50); // pull a wider list now that we sort client-side

  const reviewerColumns: SortableColumn<ReviewerLoad>[] = [
    {
      key: "name",
      label: "Reviewer",
      sortValue: (r) => r.name,
      render: (r) => (
        <span className="who">
          <Avatar code={r.code} title={r.name} />
          <span style={{ fontWeight: 500 }}>{r.name}</span>
        </span>
      ),
    },
    {
      key: "role",
      label: "Role",
      sortValue: (r) => r.role,
      render: (r) => <span className="muted">{r.role}</span>,
    },
    {
      key: "active",
      label: "Active",
      align: "right",
      sortValue: (r) => r.active,
      render: (r) => <span className="num">{r.active.toLocaleString()}</span>,
    },
    {
      key: "closed30d",
      label: "Closed (30d)",
      align: "right",
      sortValue: (r) => r.closed30d,
      render: (r) => <span className="num">{r.closed30d.toLocaleString()}</span>,
    },
    {
      key: "avgSbdHours",
      label: "Avg SBD hrs",
      align: "right",
      sortValue: (r) => r.avgSbdHours,
      render: (r) => <span className="num">{r.avgSbdHours.toFixed(1)}</span>,
    },
    {
      key: "slaPct",
      label: "SLA %",
      align: "right",
      sortValue: (r) => r.slaPct,
      render: (r) => {
        const variant: "ok" | "warn" | "bad" =
          r.slaPct >= 90 ? "ok" : r.slaPct >= 70 ? "warn" : "bad";
        return <Pill variant={variant}>{r.slaPct}%</Pill>;
      },
    },
    {
      key: "load",
      label: "Load",
      width: 200,
      sortValue: (r) => r.load,
      render: (r) => {
        const variant: "ok" | "warn" | "bad" | "accent" =
          r.load > 100 ? "bad" : r.load > 85 ? "warn" : "accent";
        return <Progress value={Math.min(100, r.load)} variant={variant} />;
      },
    },
  ];

  const orgColumns: SortableColumn<OrgRow>[] = [
    {
      key: "org",
      label: "Org",
      sortValue: (o) => o.org,
    },
    {
      key: "total",
      label: "Total",
      align: "right",
      sortValue: (o) => o.total,
      render: (o) => <span className="num">{o.total.toLocaleString()}</span>,
    },
    {
      key: "inFlight",
      label: "In flight",
      align: "right",
      sortValue: (o) => o.inFlight,
      render: (o) => <span className="num">{o.inFlight.toLocaleString()}</span>,
    },
    {
      key: "overdue",
      label: "Overdue",
      align: "right",
      sortValue: (o) => o.overdue,
      render: (o) => (
        <span className="num" style={{ color: o.overdue > 0 ? "var(--bad)" : "var(--ink-3)" }}>
          {o.overdue.toLocaleString()}
        </span>
      ),
    },
  ];

  type Requester = { name: string; total: number; rejectedRatio: number };
  const requesterColumns: SortableColumn<Requester>[] = [
    {
      key: "name",
      label: "Requester",
      sortValue: (r) => r.name,
    },
    {
      key: "total",
      label: "Submitted",
      align: "right",
      sortValue: (r) => r.total,
      render: (r) => <span className="num">{r.total.toLocaleString()}</span>,
    },
    {
      key: "rejectedRatio",
      label: "Rejected ratio",
      align: "right",
      sortValue: (r) => r.rejectedRatio,
      render: (r) => (
        <span className="num" style={{ color: r.rejectedRatio > 0.1 ? "var(--bad)" : "var(--ink-2)" }}>
          {(r.rejectedRatio * 100).toFixed(1)}%
        </span>
      ),
    },
  ];

  return (
    <>
      <Topbar section="People" />
      <div className="page">
        <SectionHead
          eyebrow="Team load"
          title={<>Who's <em>carrying</em> what</>}
          sub="Active count, recent throughput, and SLA compliance per reviewer. Click any column header to sort. One analyst per assessment ideally."
        />

        <Card tight>
          <SortableTable
            rows={reviewers}
            columns={reviewerColumns}
            rowKey={(r) => r.code}
            defaultSort={{ key: "active", dir: "desc" }}
            emptyMessage="No reviewers in the dataset yet — import an Excel export to populate."
          />
        </Card>

        <SectionHead
          eyebrow="Demand"
          title={<>Where the work <em>comes from</em></>}
          sub="Volume by VP and Director org, and the requesters submitting the most ICAAs."
        />

        <div className="grid-2">
          <Card title="By Service VP Org" sub="Top of the org tree." tight>
            <SortableTable
              rows={vpOrgs}
              columns={orgColumns}
              rowKey={(o) => o.org}
              defaultSort={{ key: "total", dir: "desc" }}
              emptyMessage="No VP orgs in the dataset."
            />
          </Card>
          <Card title="By Service Director Org" tight>
            <SortableTable
              rows={dirOrgs}
              columns={orgColumns}
              rowKey={(o) => o.org}
              defaultSort={{ key: "total", dir: "desc" }}
              emptyMessage="No Director orgs in the dataset."
            />
          </Card>
        </div>

        <Card title="Top requesters" sub="ICAA submitters. Rejection ratio flags low-quality submissions." tight>
          <SortableTable
            rows={requesters}
            columns={requesterColumns}
            rowKey={(r) => r.name}
            defaultSort={{ key: "total", dir: "desc" }}
            emptyMessage="No requesters in the dataset."
          />
        </Card>
      </div>
    </>
  );
}
