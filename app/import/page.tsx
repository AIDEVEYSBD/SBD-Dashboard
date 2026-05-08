import { Card } from "@/components/Card";
import { ImportForm } from "@/components/ImportForm";
import { SectionHead } from "@/components/SectionHead";
import { Topbar } from "@/components/Topbar";
import { getDatasetSummary } from "@/lib/queries";

// Don't statically pre-render — the dataset summary depends on the JSON file
// mtime which changes after each import.
export const dynamic = "force-dynamic";

function fmtAgo(d: Date | null): string {
  if (!d) return "never";
  const ms = Date.now() - d.getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function ImportPage() {
  const summary = getDatasetSummary();

  return (
    <>
      <Topbar section="Import" />
      <div className="page">
        <SectionHead
          eyebrow="Data — Excel import"
          title={<>Bring the <em>latest export</em> in</>}
          sub="Upload ICAA and ISA workbooks separately. Existing IDs get overwritten with the latest values; new IDs are appended. Column names match case-insensitively and tolerate small typos."
        />

        <Card title="Currently loaded" sub={`Last updated ${fmtAgo(summary.lastModified)}`}>
          <div className="grid-3">
            <div className="import-summary">
              <span className="eyebrow">ICAA</span>
              <span className="import-summary-total tnum">{summary.icaaTotal.toLocaleString()}</span>
              <div className="import-summary-split">
                <span><span className="mono">{summary.icaaInFlight.toLocaleString()}</span> in flight</span>
                <span><span className="mono">{summary.icaaCompleted.toLocaleString()}</span> completed</span>
              </div>
            </div>
            <div className="import-summary">
              <span className="eyebrow">ISA</span>
              <span className="import-summary-total tnum">{summary.isaTotal.toLocaleString()}</span>
              <div className="import-summary-split">
                <span><span className="mono">{summary.isaInFlight.toLocaleString()}</span> in flight</span>
                <span><span className="mono">{summary.isaCompleted.toLocaleString()}</span> completed</span>
              </div>
            </div>
            <div className="import-summary">
              <span className="eyebrow">Combined</span>
              <span className="import-summary-total tnum">{(summary.icaaTotal + summary.isaTotal).toLocaleString()}</span>
              <div className="import-summary-split">
                <span>across both kinds</span>
              </div>
            </div>
          </div>
        </Card>

        <ImportForm />
      </div>
    </>
  );
}
