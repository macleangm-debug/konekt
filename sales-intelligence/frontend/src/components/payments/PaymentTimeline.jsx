import React from "react";

const steps = [
  { key: "issued", label: "Invoice Issued" },
  { key: "proof_submitted", label: "Payment Submitted" },
  { key: "verification", label: "Verification In Progress" },
  { key: "confirmed", label: "Payment Confirmed" },
  { key: "fulfilled", label: "Processing / Fulfilled" },
];

export default function PaymentTimeline({ events = [] }) {
  const completedKeys = new Set((events || []).map((e) => e.event_key));
  const currentIndex = steps.reduce((acc, step, idx) => completedKeys.has(step.key) ? idx : acc, 0);

  return (
    <div className="rounded-[2rem] border bg-white p-6">
      <div className="text-2xl font-bold text-[#20364D]">Payment Timeline</div>
      <div className="space-y-4 mt-6">
        {steps.map((step, i) => {
          const active = i <= currentIndex && completedKeys.has(step.key);
          return (
            <div key={step.key} className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
              <div>
                <div className={active ? "font-semibold text-[#20364D]" : "text-slate-400"}>
                  {step.label}
                </div>
                {events.find((e) => e.event_key === step.key)?.note ? (
                  <div className="text-xs text-slate-500 mt-1">
                    {events.find((e) => e.event_key === step.key)?.note}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
