import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import KpiCard from "../../components/dashboard/KpiCard";
import SectionCard from "../../components/dashboard/SectionCard";
import AffiliateCard from "../../components/affiliate/AffiliateCard";
import AffiliateProductPromoTable from "../../components/affiliate/AffiliateProductPromoTable";
import AffiliateEarningsTable from "../../components/affiliate/AffiliateEarningsTable";
import { Loader2 } from "lucide-react";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function AffiliateDashboardV2() {
  const [products, setProducts] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [summary, setSummary] = useState({});
  const [promoCode, setPromoCode] = useState("KONEKT");
  const [affiliateName, setAffiliateName] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [promoRes, earningsRes, profileRes] = await Promise.all([
        api.get("/api/affiliate/product-promotions").catch(() => ({ data: { products: [], promo_code: "KONEKT" } })),
        api.get("/api/affiliate/earnings-summary").catch(() => ({ data: { summary: {}, earnings: [] } })),
        api.get("/api/affiliate/me").catch(() => ({ data: { profile: {} } })),
      ]);

      setProducts(promoRes.data?.products || []);
      setPromoCode(promoRes.data?.promo_code || "KONEKT");
      setSummary(earningsRes.data?.summary || {});
      setEarnings(earningsRes.data?.earnings || []);

      const profile = profileRes.data?.profile || {};
      setAffiliateName(profile.name || "");
      setReferralLink(profile.referral_link || `https://konekt.co.tz/?ref=${promoRes.data?.promo_code || "KONEKT"}`);
    } catch (err) {
      console.error("Failed to load affiliate dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="affiliate-loading">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8" data-testid="affiliate-dashboard-v2">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Earned" value={money(summary.total_earned)} helper="All time" accent="emerald" />
        <KpiCard label="Pending Payout" value={money(summary.pending_payout)} helper="Awaiting payout" accent="amber" />
        <KpiCard label="Paid Out" value={money(summary.paid_out)} helper="Already paid" accent="blue" />
        <KpiCard label="Referrals" value={summary.referral_count || 0} helper="Tracked orders" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <AffiliateCard affiliateName={affiliateName} promoCode={promoCode} referralLink={referralLink} />
        <SectionCard title="How to Earn" subtitle="Share your promo code or referral link.">
          <div className="grid gap-3 text-sm text-slate-700">
            <div className="rounded-xl border bg-slate-50 p-4">Your code and links are ready to share at all times.</div>
            <div className="rounded-xl border bg-slate-50 p-4">Each eligible order tracks your commission automatically.</div>
            <div className="rounded-xl border bg-slate-50 p-4">Customers receive discounts from the distributable margin pool.</div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Products & Promotions" subtitle="Pre-calculated earnings and customer discount per product.">
        <AffiliateProductPromoTable rows={products} baseUrl={window.location.origin} />
      </SectionCard>

      <SectionCard title="Recent Earnings" subtitle="Your latest affiliate commissions and payout status.">
        <AffiliateEarningsTable rows={earnings} />
      </SectionCard>
    </div>
  );
}
