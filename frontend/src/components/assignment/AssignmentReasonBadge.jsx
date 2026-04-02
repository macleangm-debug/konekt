import React from "react";

const REASON_LABELS = {
  exact_stock: { label: "Allocated stock available", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  partial_stock: { label: "Partial stock available", color: "text-amber-700 bg-amber-50 border-amber-200" },
  made_to_order: { label: "Made to order", color: "text-blue-700 bg-blue-50 border-blue-200" },
  on_demand: { label: "On-demand capable vendor", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  product_owner: { label: "Product catalog vendor", color: "text-slate-700 bg-slate-50 border-slate-200" },
  promo_capability_match: { label: "Promo: blank stock + suitability", color: "text-purple-700 bg-purple-50 border-purple-200" },
  service_capability_match: { label: "Service: capability + performance", color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  manual_override: { label: "Manual override", color: "text-orange-700 bg-orange-50 border-orange-200" },
  item_vendor_id: { label: "Item vendor fallback", color: "text-slate-600 bg-slate-50 border-slate-200" },
  product_catalog_vendor: { label: "Product catalog fallback", color: "text-slate-600 bg-slate-50 border-slate-200" },
  unassigned: { label: "Unassigned", color: "text-red-700 bg-red-50 border-red-200" },
};

export default function AssignmentReasonBadge({ reasonCode = "" }) {
  const config = REASON_LABELS[reasonCode] || { label: reasonCode || "Unknown", color: "text-slate-600 bg-slate-50 border-slate-200" };
  return (
    <span
      data-testid={`assignment-reason-badge-${reasonCode}`}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.color}`}
    >
      {config.label}
    </span>
  );
}
