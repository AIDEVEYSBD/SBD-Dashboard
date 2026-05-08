import { SkeletonCard, SkeletonHeader } from "@/components/Skeleton";
import { Topbar } from "@/components/Topbar";

export default function AgingLoading() {
  return (
    <>
      <Topbar section="Aging & SLA" />
      <div className="page">
        <SkeletonHeader wide />
        <div className="grid-3">
          <SkeletonCard height={260} />
          <SkeletonCard height={260} />
          <SkeletonCard height={260} />
        </div>
        <SkeletonHeader />
        <div className="grid-3">
          <SkeletonCard height={260} />
          <SkeletonCard height={260} />
          <SkeletonCard height={260} />
        </div>
        <SkeletonHeader />
        <SkeletonCard height={400} />
        <div className="grid-2">
          <SkeletonCard height={400} />
          <SkeletonCard height={400} />
        </div>
      </div>
    </>
  );
}
