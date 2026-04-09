import React, { useEffect, useMemo, useState } from "react";
import { Copy, Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

function MetricCard({ label, value }) {
  return (
    <div className="rounded-3xl border bg-white p-6" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-bold text-[#20364D] mt-2">{value}</div>
    </div>
  );
}

export default function AffiliateDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("partner_token") || localStorage.getItem("konekt_token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const [sumRes, campRes] = await Promise.all([
          fetch(`${API}/api/affiliate/dashboard/summary`, { headers }),
          fetch(`${API}/api/affiliate-promotions/available`, { headers }),
        ]);
        
        if (sumRes.ok) {
          setSummary(await sumRes.json());
        } else {
          const err = await sumRes.json();
          setError(err.detail || "Failed to load dashboard");
        }
        
        if (campRes.ok) {
          setCampaigns(await campRes.json());
        }
      } catch (err) {
        setError("Failed to load affiliate dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const shareText = useMemo(() => {
    if (!summary?.share_link) return "";
    return `Check out this platform through my referral link: ${summary.share_link}`;
  }, [summary]);

  const copyLink = async () => {
    if (!summary?.share_link) return;
    await navigator.clipboard.writeText(summary.share_link);
    toast.success("Referral link copied!");
  };

  const shareWhatsApp = () => {
    if (!shareText) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A843]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <a href="/login" className="text-[#D4A843] hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="bg-slate-50 min-h-screen px-6 py-10" data-testid="affiliate-dashboard">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="rounded-[2rem] bg-gradient-to-r from-[#0E1A2B] to-[#20364D] text-white p-8">
          <div className="text-4xl font-bold">Affiliate Dashboard</div>
          <p className="text-slate-200 mt-3">
            Track your referral performance, campaign opportunities, and earnings.
          </p>

          <div className="grid md:grid-cols-[1fr_auto] gap-4 items-center mt-8">
            <div className="rounded-2xl bg-white/10 border border-white/10 px-5 py-4">
              <div className="text-sm text-slate-300">Referral Code</div>
              <div className="text-2xl font-bold mt-1" data-testid="referral-code">{summary.affiliate_code}</div>
              <div className="text-sm text-slate-300 mt-3 break-all" data-testid="share-link">{summary.share_link}</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={copyLink} 
                className="rounded-xl bg-[#D4A843] px-5 py-3 font-semibold text-[#17283C] flex items-center justify-center gap-2"
                data-testid="copy-link-btn"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </button>
              <button 
                onClick={shareWhatsApp} 
                className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white flex items-center justify-center gap-2"
                data-testid="share-whatsapp-btn"
              >
                <Share2 className="w-4 h-4" />
                Share on WhatsApp
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          <MetricCard label="Total Sales" value={Number(summary.total_sales || 0).toLocaleString()} />
          <MetricCard label="Total Commission" value={Number(summary.total_commission || 0).toLocaleString()} />
          <MetricCard label="Pending Commission" value={Number(summary.pending_commission || 0).toLocaleString()} />
          <MetricCard label="Paid Commission" value={Number(summary.paid_commission || 0).toLocaleString()} />
        </div>

        <div className="grid xl:grid-cols-2 gap-6">
          <div className="rounded-3xl border bg-white p-8">
            <div className="text-2xl font-bold text-[#20364D]">Recent Earnings</div>
            <div className="space-y-4 mt-6 max-h-[400px] overflow-y-auto">
              {(summary.commissions || []).length ? (
                summary.commissions.map((item, idx) => (
                  <div key={`${item.order_id}-${idx}`} className="rounded-2xl border bg-slate-50 p-4">
                    <div className="font-semibold text-[#20364D]">Order: {item.order_id || "Pending Reference"}</div>
                    <div className="text-sm text-slate-500 mt-1">Status: <span className={item.status === 'paid' ? 'text-green-600' : 'text-amber-600'}>{item.status}</span></div>
                    <div className="text-sm mt-3">Sale Value: {Number(item.sale_value || 0).toLocaleString()}</div>
                    <div className="text-sm font-medium">Commission: {Number(item.commission || 0).toLocaleString()}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border bg-slate-50 p-6 text-slate-600">
                  No commission records yet. Share your link to start earning!
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-8">
            <div className="text-2xl font-bold text-[#20364D]">Available Promotions</div>
            <div className="space-y-4 mt-6 max-h-[400px] overflow-y-auto">
              {campaigns.length ? (
                campaigns.map((item) => (
                  <div key={item.campaign_id} className="rounded-2xl border bg-slate-50 p-4">
                    <div className="font-semibold text-[#20364D]">{item.campaign_name}</div>
                    <div className="text-sm text-slate-500 mt-1">
                      {item.scope_type} • {item.scope_value || "All Products"}
                    </div>

                    <div className="text-sm mt-3">
                      {item.promotion_type === "display_uplift"
                        ? `Customers see ${item.uplift_percent}% display discount`
                        : `Customers get ${item.real_discount_percent}% real discount`}
                    </div>

                    <div className="text-sm mt-2 font-medium text-[#D4A843]">
                      You earn:{" "}
                      {item.affiliate_payout_type === "fixed"
                        ? `${item.currency} ${Number(item.affiliate_payout_value || 0).toLocaleString()} per sale`
                        : `${item.affiliate_payout_value}% ${item.affiliate_payout_type === "percent_margin" ? "of margin" : "of sale"}`}
                    </div>

                    <div className="text-xs text-slate-500 mt-2">
                      Min. sale: {item.currency} {Number(item.minimum_sale_amount || 0).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border bg-slate-50 p-6 text-slate-600">
                  No active promotions yet. Check back soon!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
