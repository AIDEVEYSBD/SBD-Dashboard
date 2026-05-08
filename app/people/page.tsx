import { Card } from "@/components/Card";
import { OrgTable, RequestersTable, ReviewerTable } from "@/components/PeopleTables";
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
  const requesters = getTopRequesters(50);

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
          <ReviewerTable rows={reviewers} />
        </Card>

        <SectionHead
          eyebrow="Demand"
          title={<>Where the work <em>comes from</em></>}
          sub="Volume by VP and Director org, and the requesters submitting the most ICAAs."
        />

        <div className="grid-2">
          <Card title="By Service VP Org" sub="Top of the org tree." tight>
            <OrgTable rows={vpOrgs} />
          </Card>
          <Card title="By Service Director Org" tight>
            <OrgTable rows={dirOrgs} />
          </Card>
        </div>

        <Card title="Top requesters" sub="ICAA submitters. Rejection ratio flags low-quality submissions." tight>
          <RequestersTable rows={requesters} />
        </Card>
      </div>
    </>
  );
}
