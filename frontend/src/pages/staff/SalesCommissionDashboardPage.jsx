import React from "react";
import SalesCommissionSummary from "../../components/sales/SalesCommissionSummary";
import AffiliateReferralToolsCard from "../../components/affiliate/AffiliateReferralToolsCard";

const metrics = {
  assigned: 34,
  closed: 11,
  earned: "TZS 248,000",
  pending: "TZS 96,000",
  conversion: "32%",
};

export default function SalesCommissionDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Sales Commission Dashboard</div>
        <div className="text-slate-600 mt-2">
          Minimal allowance, stronger commission visibility, and shareable link capability for sales teams.
        </div>
      </div>

      <SalesCommissionSummary metrics={metrics} />

      <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-6">
        <AffiliateReferralToolsCard
          referralLink="https://konekt.co.tz/?ref=SALE123"
          promoCode="SALE123"
        />

        <div className="rounded-[2rem] border bg-white p-8">
          <div className="text-2xl font-bold text-[#20364D]">How sales commission works</div>
          <p className="text-slate-600 mt-4 leading-7">
            Sales commission is generated only from the protected extra distributable layer and only after payment approval.
            This keeps company minimum margin safe while still rewarding performance.
          </p>
        </div>
      </div>
    </div>
  );
}
