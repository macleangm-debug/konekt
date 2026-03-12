import React from "react";

const statusStyles = {
  unpaid: "bg-slate-100 text-slate-700",
  pending: "bg-yellow-100 text-yellow-700",
  pending_payment: "bg-yellow-100 text-yellow-700",
  awaiting_customer_payment: "bg-amber-100 text-amber-700",
  payment_submitted: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  partially_paid: "bg-orange-100 text-orange-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const statusLabels = {
  unpaid: "Unpaid",
  pending: "Pending",
  pending_payment: "Pending Payment",
  awaiting_customer_payment: "Awaiting Payment",
  payment_submitted: "Payment Submitted",
  paid: "Paid",
  failed: "Failed",
  partially_paid: "Partially Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export default function PaymentStatusBadge({ status = "unpaid" }) {
  const style = statusStyles[status] || statusStyles.unpaid;
  const label = statusLabels[status] || status.replaceAll("_", " ");

  return (
    <span 
      className={`rounded-full px-3 py-1 text-xs font-medium ${style}`}
      data-testid="payment-status-badge"
    >
      {label}
    </span>
  );
}
