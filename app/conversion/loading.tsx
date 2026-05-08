import { SkeletonCard, SkeletonHeader } from "@/components/Skeleton";
import { Topbar } from "@/components/Topbar";

export default function ConversionLoading() {
  return (
    <>
      <Topbar section="Conversion" />
      <div className="page">
        <SkeletonHeader wide />
        <div className="grid-3">
          <SkeletonCard height={220} />
          <SkeletonCard height={220} />
          <SkeletonCard height={220} />
        </div>
        <SkeletonCard height={320} />
        <div className="grid-2">
          <SkeletonCard height={260} />
          <SkeletonCard height={260} />
        </div>
        <SkeletonCard height={260} />
      </div>
    </>
  );
}
