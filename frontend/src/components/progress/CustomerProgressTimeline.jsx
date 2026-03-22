import React from "react";

const PRODUCT_STEPS = ["Order Received", "Payment Pending", "Payment Under Verification", "Order Confirmed", "Preparing Your Order", "Packed", "Dispatched", "Delivered", "Completed"];
const SERVICE_STEPS = ["Request Received", "Under Review", "Quote in Preparation", "Quote Sent", "Approved", "Payment Pending", "Payment Confirmed", "Scheduled", "In Progress", "Final Review", "Completed"];

export default function CustomerProgressTimeline({ itemType = "product", currentExternalStatus = "Order Confirmed" }) {
  const steps = itemType === "product" ? PRODUCT_STEPS : SERVICE_STEPS;
  const idx = Math.max(steps.indexOf(currentExternalStatus), 0);

  return (
    <div className="rounded-[2rem] border bg-white p-8">
      <div className="text-2xl font-bold text-[#20364D]">Progress Timeline</div>
      <div className="space-y-4 mt-6">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${i <= idx ? "bg-emerald-500" : "bg-slate-300"}`} />
            <div className={i <= idx ? "font-semibold text-[#20364D]" : "text-slate-400"}>{step}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
