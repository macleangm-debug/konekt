import React from "react";

const STATUS_MAP = {
  active: { label: "Active", className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  at_risk: { label: "At Risk", className: "text-amber-700 bg-amber-50 border-amber-200" },
  inactive: { label: "Inactive", className: "text-orange-700 bg-orange-50 border-orange-200" },
  lost: { label: "Lost", className: "text-red-700 bg-red-50 border-red-200" },
};

export default function DormantStatusBadge({ status = "active" }) {
  const config = STATUS_MAP[status] || STATUS_MAP.active;
  return (
    <span
      data-testid={`dormant-status-badge-${status}`}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${config.className}`}
    >
      {config.label}
    </span>
  );
}
