import React from "react";

const STATUS_THEMES = {
  // Payment
  uploaded:            { label: "Under Review",         color: "bg-blue-100 text-blue-800" },
  approved:            { label: "Approved",             color: "bg-green-100 text-green-800" },
  rejected:            { label: "Rejected",             color: "bg-red-100 text-red-700" },
  proof_rejected:      { label: "Proof Rejected",       color: "bg-red-100 text-red-700" },
  under_review:        { label: "Under Review",         color: "bg-blue-100 text-blue-800" },
  // Invoice
  pending_payment:     { label: "Unpaid",               color: "bg-amber-100 text-amber-800" },
  pending:             { label: "Pending",              color: "bg-amber-100 text-amber-800" },
  paid:                { label: "Paid",                 color: "bg-green-100 text-green-800" },
  partially_paid:      { label: "Partially Paid",       color: "bg-orange-100 text-orange-800" },
  overdue:             { label: "Overdue",              color: "bg-red-100 text-red-700" },
  payment_under_review:{ label: "Under Review",         color: "bg-blue-100 text-blue-800" },
  awaiting_payment_proof: { label: "Awaiting Proof",    color: "bg-amber-100 text-amber-800" },
  // Order
  created:             { label: "Created",              color: "bg-blue-100 text-blue-800" },
  processing:          { label: "Processing",           color: "bg-amber-100 text-amber-800" },
  shipped:             { label: "Shipped",              color: "bg-indigo-100 text-indigo-800" },
  delivered:           { label: "Delivered",             color: "bg-green-100 text-green-800" },
  completed:           { label: "Completed",            color: "bg-green-100 text-green-800" },
  cancelled:           { label: "Cancelled",            color: "bg-slate-100 text-slate-500" },
  // Quote
  sent:                { label: "Sent",                 color: "bg-blue-100 text-blue-800" },
  quoting:             { label: "Quoting",              color: "bg-amber-100 text-amber-800" },
  expired:             { label: "Expired",              color: "bg-slate-100 text-slate-500" },
  converted_to_invoice:{ label: "Invoiced",             color: "bg-green-100 text-green-800" },
  // Leads
  new:                 { label: "New",                  color: "bg-blue-100 text-blue-800" },
  contacted:           { label: "Contacted",            color: "bg-indigo-100 text-indigo-800" },
  qualified:           { label: "Qualified",            color: "bg-green-100 text-green-800" },
  // Release
  released_by_payment: { label: "Released by Payment",  color: "bg-green-100 text-green-800" },
  manual:              { label: "Manually Released",    color: "bg-amber-100 text-amber-800" },
  awaiting:            { label: "Awaiting Release",     color: "bg-slate-100 text-slate-600" },
  // Customer Status
  active:              { label: "Active",               color: "bg-green-100 text-green-800" },
  at_risk:             { label: "At Risk",              color: "bg-amber-100 text-amber-800" },
  inactive:            { label: "Inactive",             color: "bg-slate-100 text-slate-500" },
};

export default function StatusBadge({ status, label: overrideLabel }) {
  const cfg = STATUS_THEMES[status] || { label: (status || "").replace(/_/g, " "), color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium capitalize whitespace-nowrap ${cfg.color}`} data-testid={`badge-${status}`}>
      {overrideLabel || cfg.label}
    </span>
  );
}
