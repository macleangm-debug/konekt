import React from "react";

export default function AffiliateProfilePage() {
  return (
    <div className="space-y-8">
      <div className="text-4xl font-bold text-[#20364D]">Affiliate Profile</div>

      <div className="rounded-[2rem] border bg-white p-8">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-500">Affiliate Name</div>
            <div className="font-semibold text-[#20364D] mt-2">Mary Konekt Growth</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Status</div>
            <div className="font-semibold text-[#20364D] mt-2">Active</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Promo Code</div>
            <div className="font-semibold text-[#20364D] mt-2">AFF123</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Payout Frequency</div>
            <div className="font-semibold text-[#20364D] mt-2">Monthly</div>
          </div>
        </div>
      </div>
    </div>
  );
}
