import { SkeletonCard, SkeletonHeader, SkeletonKpi } from "@/components/Skeleton";
import { Topbar } from "@/components/Topbar";

export default function IsaLoading() {
  return (
    <>
      <Topbar section="ISA" />
      <div className="page">
        <SkeletonHeader wide />

        <div className="grid-5">
          {Array.from({ length: 5 }, (_, i) => <SkeletonKpi key={i} />)}
        </div>

        <div className="grid-2-1">
          <SkeletonCard height={260} />
          <SkeletonCard height={260} />
        </div>

        <SkeletonCard height={140} />

        <div className="grid-2">
          <SkeletonCard height={400} />
          <SkeletonCard height={260} />
        </div>

        <SkeletonHeader />

        <div className="grid-3">
          <SkeletonCard height={180} />
          <SkeletonCard height={180} />
          <SkeletonCard height={180} />
        </div>

        <SkeletonCard height={420} />
      </div>
    </>
  );
}
