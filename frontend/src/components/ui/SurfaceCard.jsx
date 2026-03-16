import React from "react";

export default function SurfaceCard({ children, className = "", noPadding = false }) {
  return (
    <div className={`rounded-3xl border bg-white ${noPadding ? "" : "p-6"} ${className}`} data-testid="surface-card">
      {children}
    </div>
  );
}
