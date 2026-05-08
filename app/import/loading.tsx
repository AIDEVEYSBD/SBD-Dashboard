import { SkeletonCard, SkeletonHeader } from "@/components/Skeleton";
import { Topbar } from "@/components/Topbar";

export default function ImportLoading() {
  return (
    <>
      <Topbar section="Import" />
      <div className="page">
        <SkeletonHeader wide />
        <SkeletonCard height={140} />
        <SkeletonCard height={280} />
      </div>
    </>
  );
}
