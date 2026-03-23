import React from "react";
import SkeletonBlock from "../ui/SkeletonBlock";

export default function ListingGridSkeleton() {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4" data-testid="listing-skeleton">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <SkeletonBlock className="h-44 w-full rounded-none" />
          <div className="p-4 space-y-2">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonBlock className="h-4 w-20 mt-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
