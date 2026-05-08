import { SkeletonCard, SkeletonHeader, SkeletonKpi, SkeletonRows } from "@/components/Skeleton";
import { Topbar } from "@/components/Topbar";

export default function OverviewLoading() {
  return (
    <>
      <Topbar section="Dashboard" />
      <div className="page">
        <SkeletonHeader wide />

        <div className="grid-5">
          {Array.from({ length: 5 }, (_, i) => <SkeletonKpi key={i} />)}
        </div>

        <div className="grid-2-1">
          <SkeletonCard height={260} />
          <SkeletonCard height={260} />
        </div>

        <div className="grid-2">
          <SkeletonCard height={140} />
          <SkeletonCard height={140} />
        </div>

        <SkeletonCard height={260} />

        <SkeletonHeader />

        <div className="grid-2">
          <section className="card"><SkeletonRows rows={6} /></section>
          <section className="card"><SkeletonRows rows={6} /></section>
        </div>
        <div className="grid-2">
          <section className="card"><SkeletonRows rows={6} /></section>
          <section className="card"><SkeletonRows rows={6} /></section>
        </div>
      </div>
    </>
  );
}
