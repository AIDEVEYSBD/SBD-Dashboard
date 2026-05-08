import { SkeletonCard, SkeletonHeader } from "@/components/Skeleton";
import { Topbar } from "@/components/Topbar";

export default function PeopleLoading() {
  return (
    <>
      <Topbar section="People" />
      <div className="page">
        <SkeletonHeader wide />
        <SkeletonCard height={460} />
        <SkeletonHeader />
        <div className="grid-2">
          <SkeletonCard height={400} />
          <SkeletonCard height={400} />
        </div>
        <SkeletonCard height={460} />
      </div>
    </>
  );
}
