import React from "react";
import SkeletonBlock from "../ui/SkeletonBlock";

export default function ListingGridSkeleton({ count = 12 }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="listing-skeleton">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col" style={{ animationDelay: `${idx * 40}ms` }}>
          {/* Image placeholder — same 176px/h-44 as actual card */}
          <SkeletonBlock className="h-44 w-full rounded-none" />
          <div className="p-4 space-y-2.5 flex-1 flex flex-col">
            {/* Category pill */}
            <SkeletonBlock className="h-4 w-20 rounded-md" />
            {/* Title — 2 lines */}
            <SkeletonBlock className="h-3.5 w-full" />
            <SkeletonBlock className="h-3.5 w-3/5" />
            <div className="flex-1" />
            <div className="pt-3 border-t border-gray-100 space-y-2">
              {/* Price */}
              <SkeletonBlock className="h-4 w-24" />
              {/* CTA button */}
              <SkeletonBlock className="h-8 w-full rounded-lg" />
              {/* Secondary link */}
              <SkeletonBlock className="h-3 w-16 mx-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
