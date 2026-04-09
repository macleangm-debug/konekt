import React from "react";

export default function SurfaceCard({ children, className = "", noPadding = false, interactive = false }) {
  return (
    <div className={`rounded-3xl border bg-white ${noPadding ? "" : "p-6"} ${interactive ? "k-card-interactive cursor-pointer" : ""} ${className}`} data-testid="surface-card">
      {children}
    </div>
  );
}
