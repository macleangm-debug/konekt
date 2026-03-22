import React from "react";
import AffiliateTopSummary from "../../components/affiliate/AffiliateTopSummary";

const metrics = {
  clicks: 1240,
  leads: 84,
  sales: 16,
  earned: "TZS 184,000",
  pending: "TZS 72,000",
  paid: "TZS 112,000",
};

export default function AffiliateEarningsPage() {
  return (
    <div className="space-y-8">
      <div className="text-4xl font-bold text-[#20364D]">Earnings</div>
      <AffiliateTopSummary metrics={metrics} />

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="text-2xl font-bold text-[#20364D]">How earnings are protected</div>
        <p className="text-slate-600 mt-4 leading-7">
          Company margin is protected first using a minimum 20% markup on the base amount.
          Affiliate commission is then calculated only from the extra distributable layer on top of that.
        </p>
      </div>
    </div>
  );
}
