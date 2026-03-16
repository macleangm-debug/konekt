import React from "react";
import SkeletonBlock from "../ui/SkeletonBlock";

export default function ListingGridSkeleton() {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5" data-testid="listing-skeleton">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="rounded-3xl border bg-white overflow-hidden">
          <SkeletonBlock className="h-52 w-full rounded-none" />
          <div className="p-5 space-y-3">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-6 w-4/5" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-2/3" />
            <SkeletonBlock className="h-5 w-24 mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
