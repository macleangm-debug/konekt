import React from "react";

export default function AffiliateCampaignCard({ campaign }) {
  return (
    <div className="rounded-[2rem] border bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-bold text-[#20364D]">{campaign.title}</div>
          <div className="text-sm text-slate-500 mt-2">{campaign.category}</div>
        </div>
        <div className="rounded-full bg-[#F4E7BF] text-[#8B6A10] px-3 py-1 text-xs font-semibold">
          Active
        </div>
      </div>

      <p className="text-slate-600 mt-4 leading-7">{campaign.description}</p>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Customer Offer</div>
          <div className="font-semibold text-[#20364D] mt-2">{campaign.customer_offer}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Affiliate Earning</div>
          <div className="font-semibold text-[#20364D] mt-2">{campaign.affiliate_earning}</div>
        </div>
      </div>

      <div className="text-sm text-slate-500 mt-5">Valid until: {campaign.valid_until}</div>
    </div>
  );
}
