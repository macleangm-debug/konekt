import React, { useState, useEffect } from "react";
import AffiliateTopSummary from "../../components/affiliate/AffiliateTopSummary";
import AffiliateReferralToolsCard from "../../components/affiliate/AffiliateReferralToolsCard";
import AffiliateCampaignCard from "../../components/affiliate/AffiliateCampaignCard";
import AffiliateSalesTable from "../../components/affiliate/AffiliateSalesTable";
import PayoutProgressCard from "../../components/affiliate/PayoutProgressCard";
import EarnedNotificationBanner from "../../components/affiliate/EarnedNotificationBanner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Static fallback campaigns
const fallbackCampaigns = [
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

export default function AffiliateDashboardHomePage() {
  const [metrics, setMetrics] = useState({
    clicks: 0,
    leads: 0,
    sales: 0,
    earned: "TZS 0",
    pending: "TZS 0",
    paid: "TZS 0",
  });
  const [payoutProgress, setPayoutProgress] = useState(null);
  const [referralLink, setReferralLink] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [sales, setSales] = useState([]);
  const [campaigns, setCampaigns] = useState(fallbackCampaigns);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch affiliate dashboard data
        const dashRes = await fetch(`${API_URL}/api/affiliate/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (dashRes.ok) {
          const data = await dashRes.json();
          
          // Update metrics
          setMetrics({
            clicks: data.summary?.total_clicks || 0,
            leads: data.summary?.total_leads || 0,
            sales: data.commissions?.length || 0,
            earned: `TZS ${(data.summary?.total_earned || 0).toLocaleString()}`,
            pending: `TZS ${(data.summary?.payable_balance || 0).toLocaleString()}`,
            paid: `TZS ${(data.summary?.total_paid || 0).toLocaleString()}`,
          });

          // Set referral info
          setReferralLink(data.profile?.referral_link || `https://konekt.co.tz/?ref=${data.profile?.promo_code || ''}`);
          setPromoCode(data.profile?.promo_code || '');

          // Transform commissions to sales table format
          if (data.commissions && data.commissions.length > 0) {
            setSales(data.commissions.map((c, idx) => ({
              id: c.id || String(idx),
              date: c.created_at?.split('T')[0] || '',
              customer_masked: "Cust***",
              item_name: c.source_document || "Order",
              order_value: `TZS ${(c.sale_amount || 0).toLocaleString()}`,
              commission: `TZS ${(c.commission_amount || 0).toLocaleString()}`,
              status: c.status || "pending",
            })));
          }
        }

        // Fetch payout progress
        const progressRes = await fetch(`${API_URL}/api/affiliate/payout-progress`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          setPayoutProgress(progressData);
        }

      } catch (err) {
        console.error("Failed to fetch affiliate data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  return (
    <div className="space-y-8" data-testid="affiliate-dashboard">
      <div>
        <div className="text-4xl font-bold text-[#20364D]">Affiliate Dashboard</div>
        <div className="text-slate-600 mt-2">
          Track clicks, leads, successful sales, earnings, and campaigns from one place.
        </div>
      </div>

      {/* "You Just Earned" Notifications */}
      <EarnedNotificationBanner token={token} />

      {/* Key Metrics */}
      <AffiliateTopSummary metrics={metrics} />

      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
        {/* Left Column - Tools + Payout Progress */}
        <div className="space-y-6">
          <AffiliateReferralToolsCard
            referralLink={referralLink || "https://konekt.co.tz/?ref=AFF123"}
            promoCode={promoCode || "AFF123"}
          />
          
          {/* Payout Progress Card */}
          <PayoutProgressCard progress={payoutProgress} />
        </div>

        {/* Right Column - Campaigns */}
        <div className="space-y-6">
          {campaigns.map((campaign) => (
            <AffiliateCampaignCard key={campaign.title} campaign={campaign} />
          ))}
        </div>
      </div>

      {/* Sales Table */}
      <AffiliateSalesTable rows={sales} />
    </div>
  );
}
