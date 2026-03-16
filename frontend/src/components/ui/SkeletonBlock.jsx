import React from "react";

export default function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 ${className}`} />;
}
