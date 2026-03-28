import React from "react";

const statusStyles = {
  unpaid: "bg-slate-100 text-slate-700",
  pending: "bg-yellow-100 text-yellow-700",
  pending_payment: "bg-yellow-100 text-yellow-700",
  awaiting_customer_payment: "bg-amber-100 text-amber-700",
  payment_submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-blue-100 text-blue-700",
  pending_verification: "bg-blue-100 text-blue-700",
  payment_under_review: "bg-blue-100 text-blue-700",
  proof_uploaded: "bg-blue-100 text-blue-700",
  payment_proof_uploaded: "bg-blue-100 text-blue-700",
  approved: "bg-teal-100 text-teal-700",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  partially_paid: "bg-orange-100 text-orange-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  proof_rejected: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

const statusLabels = {
  unpaid: "Unpaid",
  pending: "Pending",
  pending_payment: "Awaiting Payment",
  awaiting_customer_payment: "Awaiting Payment",
  payment_submitted: "Payment Under Review",
  under_review: "Payment Under Review",
  pending_verification: "Payment Under Review",
  payment_under_review: "Payment Under Review",
  proof_uploaded: "Payment Under Review",
  payment_proof_uploaded: "Payment Under Review",
  approved: "Approved Payment",
  paid: "Paid in Full",
  failed: "Failed",
  partially_paid: "Partially Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  proof_rejected: "Payment Rejected",
  rejected: "Payment Rejected",
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
