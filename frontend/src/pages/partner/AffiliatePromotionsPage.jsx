import React from "react";
import AffiliateCampaignCard from "../../components/affiliate/AffiliateCampaignCard";

const campaigns = [
  {
    title: "Office Branding Campaign",
    category: "Printing & Branding",
    description: "Target businesses that want stronger workspace identity and visual presence.",
    customer_offer: "Commercial quote support",
    affiliate_earning: "TZS 12,000 per successful sale",
    valid_until: "30 Sept 2026",
  },
  {
    title: "Deep Cleaning Push",
    category: "Facilities Services",
    description: "Promote office deep cleaning and recurring facilities support to corporate clients.",
    customer_offer: "First engagement guidance",
    affiliate_earning: "10% of distributable layer",
    valid_until: "15 Oct 2026",
  },
];

export default function AffiliatePromotionsPage() {
  return (
    <div className="space-y-8">
      <div className="text-4xl font-bold text-[#20364D]">Promotions</div>
      <div className="grid gap-6">
        {campaigns.map((campaign) => (
          <AffiliateCampaignCard key={campaign.title} campaign={campaign} />
        ))}
      </div>
    </div>
  );
}
