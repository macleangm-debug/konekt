import React, { useMemo, useState } from "react";

const roleContent = {
  admin: [
    "Configure go-to-market settings",
    "Review dashboards and commercial rules",
    "Manage affiliates, vendors, and performance",
  ],
  affiliate: [
    "Copy your promo code and referral link",
    "Share your link on WhatsApp and social channels",
    "Track clicks, leads, sales, and payout progress",
  ],
  vendor: [
    "Review assigned jobs",
    "Update internal progress on time",
    "Respond to nudges and complete work to quality standards",
  ],
  sales: [
    "Review assigned leads and opportunities",
    "Follow up, quote, and coordinate execution",
    "Track commission and source visibility",
  ],
  finance: [
    "Verify payments and payment proofs",
    "Monitor payouts and commission approvals",
    "Keep financial operations accurate and timely",
  ],
  customer: [
    "Browse products or services",
    "Request a quote or place an order",
    "Pay, upload proof, and track progress",
  ],
};

export default function OnboardingWizard({ role = "customer", onDone }) {
  const steps = useMemo(() => roleContent[role] || roleContent.customer, [role]);
  const [idx, setIdx] = useState(0);

  const next = () => {
    if (idx >= steps.length - 1) {
      if (onDone) onDone();
      return;
    }
    setIdx(idx + 1);
  };

  return (
    <div className="rounded-[2rem] border bg-white p-8">
      <div className="text-sm uppercase tracking-[0.2em] text-slate-500 font-semibold">{role} onboarding</div>
      <div className="text-3xl font-bold text-[#20364D] mt-3">Step {idx + 1} of {steps.length}</div>
      <div className="rounded-2xl bg-slate-50 p-6 mt-6 text-slate-700 leading-7">{steps[idx]}</div>

      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-slate-500">Use this wizard to get started quickly.</div>
        <button onClick={next} className="rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold">
          {idx >= steps.length - 1 ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
