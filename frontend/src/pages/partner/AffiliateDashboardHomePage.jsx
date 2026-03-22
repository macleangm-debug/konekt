import React from "react";
import AffiliateTopSummary from "../../components/affiliate/AffiliateTopSummary";
import AffiliateReferralToolsCard from "../../components/affiliate/AffiliateReferralToolsCard";
import AffiliateCampaignCard from "../../components/affiliate/AffiliateCampaignCard";
import AffiliateSalesTable from "../../components/affiliate/AffiliateSalesTable";

const metrics = {
  clicks: 1240,
  leads: 84,
  sales: 16,
  earned: "TZS 184,000",
  pending: "TZS 72,000",
  paid: "TZS 112,000",
};

const campaigns = [
  {
    title: "Office Branding Campaign",
    category: "Printing & Branding",
    description: "Push office branding and workspace improvement support to business clients.",
    customer_offer: "Structured commercial support",
    affiliate_earning: "TZS 12,000 per successful sale",
    valid_until: "30 Sept 2026",
  },
  {
    title: "Printing & Promotional Materials",
    category: "Printing",
    description: "Suitable for corporate gifts, lanyards, name tags, and branded materials.",
    customer_offer: "Better quote support",
    affiliate_earning: "10% of distributable layer",
    valid_until: "15 Oct 2026",
  },
];

const sales = [
  {
    id: "1",
    date: "2026-03-10",
    customer_masked: "Ac*** Ltd",
    item_name: "Office Branding",
    order_value: "TZS 650,000",
    commission: "TZS 18,000",
    status: "pending",
  },
  {
    id: "2",
    date: "2026-03-08",
    customer_masked: "Be*** Group",
    item_name: "Branded Lanyards",
    order_value: "TZS 220,000",
    commission: "TZS 8,500",
    status: "paid",
  },
];

export default function AffiliateDashboardHomePage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Affiliate Dashboard</div>
        <div className="text-slate-600 mt-2">
          Track clicks, leads, successful sales, earnings, and campaigns from one place.
        </div>
      </div>

      <AffiliateTopSummary metrics={metrics} />

      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <AffiliateReferralToolsCard
          referralLink="https://konekt.co.tz/?ref=AFF123"
          promoCode="AFF123"
        />

        <div className="space-y-6">
          {campaigns.map((campaign) => (
            <AffiliateCampaignCard key={campaign.title} campaign={campaign} />
          ))}
        </div>
      </div>

      <AffiliateSalesTable rows={sales} />
    </div>
  );
}
