import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { toast } from "sonner";
import { 
  DollarSign, MousePointerClick, ShoppingCart, Share2, 
  TrendingUp, Copy, ExternalLink, Gift, ArrowRight,
  BarChart3, Calendar
} from "lucide-react";

export default function AffiliateDashboardV2() {
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    clicks: 0,
    conversions: 0,
    conversionRate: 0
  });
  const [referralLink, setReferralLink] = useState("");
  const [recentReferrals, setRecentReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, profileRes, referralsRes] = await Promise.all([
        api.get("/api/affiliate/stats").catch(() => ({ data: {} })),
        api.get("/api/affiliate/profile").catch(() => ({ data: {} })),
        api.get("/api/affiliate/referrals").catch(() => ({ data: [] }))
      ]);

      const affiliateData = statsRes.data || {};
      const profile = profileRes.data || {};
      
      setStats({
        totalEarnings: affiliateData.total_earnings || 0,
        pendingEarnings: affiliateData.pending_earnings || 0,
        clicks: affiliateData.total_clicks || 0,
        conversions: affiliateData.total_conversions || 0,
        conversionRate: affiliateData.clicks > 0 
          ? ((affiliateData.conversions / affiliateData.clicks) * 100).toFixed(1) 
          : 0
      });

      // Generate referral link
      const affiliateCode = profile.affiliate_code || profile.id?.slice(0, 8) || "AFFILIATE";
      setReferralLink(`https://konekt.co.tz/ref/${affiliateCode}`);
      
      setRecentReferrals((referralsRes.data || []).slice(0, 5));
    } catch (err) {
      console.error("Failed to load affiliate dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Konekt",
          text: "Get promotional materials and design services at great prices!",
          url: referralLink
        });
      } catch (err) {
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  return (
    <div className="space-y-8" data-testid="affiliate-dashboard-v2">
      {/* Hero Header */}
      <div className="bg-[#20364D] text-white rounded-[2rem] p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
            <p className="text-slate-200 mt-2">
              Share, earn, and track your performance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={shareReferralLink}
              className="flex items-center gap-2 bg-[#F4E7BF] text-[#8B6A10] px-5 py-3 rounded-xl font-semibold hover:bg-[#e8dbb3] transition"
            >
              <Share2 className="w-5 h-5" />
              Share Link
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white border rounded-2xl p-6 hover:shadow-lg transition">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Total Earnings</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">
            TZS {stats.totalEarnings.toLocaleString()}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 hover:shadow-lg transition">
          <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center">
            <Gift className="w-6 h-6 text-yellow-600" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Pending Payout</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">
            TZS {stats.pendingEarnings.toLocaleString()}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 hover:shadow-lg transition">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <MousePointerClick className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Total Clicks</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">
            {stats.clicks.toLocaleString()}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 hover:shadow-lg transition">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <ShoppingCart className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Conversions</p>
          <h2 className="text-2xl font-bold text-[#20364D] mt-1">{stats.conversions}</h2>
          <p className="text-xs text-slate-400 mt-1">{stats.conversionRate}% rate</p>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="bg-gradient-to-br from-[#20364D] to-[#2a4563] text-white rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Share2 className="w-6 h-6" />
          <h3 className="text-xl font-bold">Your Referral Link</h3>
        </div>
        <p className="text-slate-200 text-sm mb-4">
          Share this link and earn commission on every successful order!
        </p>
        <div className="flex gap-3">
          <input 
            type="text"
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50"
            value={referralLink}
            readOnly
          />
          <button 
            onClick={copyReferralLink}
            className="flex items-center gap-2 bg-white text-[#20364D] px-5 py-3 rounded-xl font-semibold hover:bg-slate-100 transition"
            data-testid="copy-link-btn"
          >
            <Copy className="w-5 h-5" />
            Copy
          </button>
          <a 
            href={referralLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#F4E7BF] text-[#8B6A10] px-5 py-3 rounded-xl font-semibold hover:bg-[#e8dbb3] transition"
          >
            <ExternalLink className="w-5 h-5" />
            Preview
          </a>
        </div>
      </div>

      {/* Performance & Recent Referrals */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Chart Placeholder */}
        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#20364D]">Performance</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              Last 30 days
            </div>
          </div>
          
          <div className="h-48 flex items-center justify-center bg-slate-50 rounded-xl">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">Performance chart coming soon</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <div className="text-2xl font-bold text-[#20364D]">{stats.clicks}</div>
              <div className="text-xs text-slate-500">Clicks this month</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <div className="text-2xl font-bold text-[#20364D]">{stats.conversions}</div>
              <div className="text-xs text-slate-500">Sales this month</div>
            </div>
          </div>
        </div>

        {/* Recent Referrals */}
        <div className="bg-white border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#20364D]">Recent Referrals</h3>
            <Link to="/affiliate/referrals" className="text-sm text-[#20364D] hover:underline">
              View All
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : recentReferrals.length === 0 ? (
            <div className="text-center py-8">
              <Share2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No referrals yet</p>
              <p className="text-sm text-slate-500 mt-1">Start sharing your link to earn commissions!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReferrals.map((referral) => (
                <div 
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div>
                    <div className="font-medium text-slate-800">{referral.customer_name || "New Customer"}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">
                      +TZS {(referral.commission || 0).toLocaleString()}
                    </div>
                    <div className={`text-xs ${
                      referral.status === "paid" ? "text-green-500" : "text-yellow-500"
                    }`}>
                      {referral.status || "pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white border rounded-2xl p-6">
        <h3 className="text-xl font-bold text-[#20364D] mb-4">Quick Links</h3>
        <div className="flex flex-wrap gap-4">
          <Link 
            to="/affiliate/payouts"
            className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
          >
            <DollarSign className="w-5 h-5 text-[#20364D]" />
            <span className="font-medium text-slate-700">Payout History</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link 
            to="/affiliate/resources"
            className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
          >
            <Share2 className="w-5 h-5 text-[#20364D]" />
            <span className="font-medium text-slate-700">Marketing Resources</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link 
            to="/affiliate/settings"
            className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
          >
            <Gift className="w-5 h-5 text-[#20364D]" />
            <span className="font-medium text-slate-700">Payout Settings</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
