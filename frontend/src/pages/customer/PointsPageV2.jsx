import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Gift, Users, Copy, Check, TrendingUp, Award, Share2, MessageCircle } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import MetricCard from "../../components/ui/MetricCard";
import BrandButton from "../../components/ui/BrandButton";
import axios from "axios";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function PointsPageV2() {
  const [loyaltyData, setLoyaltyData] = useState({
    points: 0,
    tier: "Bronze",
    referralCode: "",
    referralCount: 0,
    referralEarnings: 0,
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axios.get(`${API_URL}/api/customer/loyalty`, { headers }).catch(() => ({ data: {} })),
      axios.get(`${API_URL}/api/customer/referrals`, { headers }).catch(() => ({ data: {} })),
      axios.get(`${API_URL}/api/customer/points-history`, { headers }).catch(() => ({ data: [] })),
    ])
      .then(([loyaltyRes, referralRes, historyRes]) => {
        setLoyaltyData({
          points: loyaltyRes.data?.points || 0,
          tier: loyaltyRes.data?.tier || "Bronze",
          referralCode: referralRes.data?.referral_code || loyaltyRes.data?.referral_code || "",
          referralCount: referralRes.data?.total_referrals || 0,
          referralEarnings: referralRes.data?.total_earnings || 0,
        });
        setHistory(historyRes.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const getReferralLink = () => `${window.location.origin}/r/${loyaltyData.referralCode}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(getReferralLink());
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`Check out this platform - Business products and services made easy! Use my referral link to get started: ${getReferralLink()}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const tierBenefits = {
    Bronze: ["1% cashback on orders", "Birthday reward", "Early access to sales"],
    Silver: ["2% cashback on orders", "Priority support", "Exclusive offers"],
    Gold: ["3% cashback on orders", "Free shipping", "VIP events"],
    Platinum: ["5% cashback on orders", "Dedicated account manager", "All benefits"],
  };

  return (
    <div data-testid="referrals-page">
      <PageHeader 
        title="Referrals & Rewards"
        subtitle="Share with colleagues and friends. Earn rewards when they order."
      />

      {/* Hero Referral Card */}
      <SurfaceCard className="mb-8 bg-gradient-to-br from-[#20364D] to-[#1a2d40] text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-6 h-6 text-[#D4A843]" />
              <h2 className="text-xl font-bold">Invite & Earn</h2>
            </div>
            <p className="text-slate-200 max-w-md">
              Share with colleagues, companies, and friends. Earn rewards when they order products or request services through your referral.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={copyReferralLink}
              className="inline-flex items-center justify-center gap-2 bg-white text-[#20364D] font-semibold px-5 py-3 rounded-xl hover:bg-slate-100 transition"
              data-testid="copy-referral-btn"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? "Copied!" : "Copy Referral Link"}
            </button>
            <button
              onClick={shareOnWhatsApp}
              className="inline-flex items-center justify-center gap-2 bg-green-500 text-white font-semibold px-5 py-3 rounded-xl hover:bg-green-600 transition"
              data-testid="share-whatsapp-btn"
            >
              <MessageCircle className="w-5 h-5" />
              Share on WhatsApp
            </button>
          </div>
        </div>
        
        {loyaltyData.referralCode && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-sm text-slate-300 mb-2">Your Referral Code</p>
            <div className="flex items-center gap-4">
              <span className="font-mono text-2xl font-bold tracking-wider text-[#D4A843]">
                {loyaltyData.referralCode}
              </span>
              <span className="text-sm text-slate-400">
                Share link: {getReferralLink()}
              </span>
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard 
          label="Total Points" 
          value={loyaltyData.points.toLocaleString()} 
          icon={Gift}
        />
        <MetricCard 
          label="Current Tier" 
          value={loyaltyData.tier} 
          icon={Award}
        />
        <MetricCard 
          label="People Referred" 
          value={loyaltyData.referralCount} 
          icon={Users}
        />
        <MetricCard 
          label="Referral Earnings" 
          value={`TZS ${loyaltyData.referralEarnings.toLocaleString()}`} 
          icon={TrendingUp}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* How It Works */}
        <SurfaceCard>
          <h2 className="text-lg font-bold text-[#20364D] mb-4">How Referrals Work</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#D4A843] text-white flex items-center justify-center font-bold">1</div>
              <div>
                <p className="font-medium">Share Your Link</p>
                <p className="text-sm text-slate-600">Send your unique referral link to colleagues, companies, and friends.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#D4A843] text-white flex items-center justify-center font-bold">2</div>
              <div>
                <p className="font-medium">They Sign Up & Order</p>
                <p className="text-sm text-slate-600">When they register and place their first order, you both earn rewards.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#D4A843] text-white flex items-center justify-center font-bold">3</div>
              <div>
                <p className="font-medium">Earn Points & Commissions</p>
                <p className="text-sm text-slate-600">Accumulate points for discounts and earn commissions on referred sales.</p>
              </div>
            </div>
          </div>
        </SurfaceCard>

        {/* Tier Benefits */}
        <SurfaceCard>
          <h2 className="text-lg font-bold text-[#20364D] mb-4">Your {loyaltyData.tier} Benefits</h2>
          <div className="space-y-3">
            {(tierBenefits[loyaltyData.tier] || tierBenefits.Bronze).map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <Check className="w-5 h-5 text-green-600" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-slate-500">
              Earn more referrals to unlock Silver, Gold, and Platinum tiers with better rewards!
            </p>
          </div>
        </SurfaceCard>
      </div>

      {/* Points History */}
      <SurfaceCard className="mt-6">
        <h2 className="text-lg font-bold text-[#20364D] mb-4">Points History</h2>
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.slice(0, 10).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border">
                <div>
                  <div className="font-medium">{item.description || "Points earned"}</div>
                  <div className="text-sm text-slate-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className={`font-bold ${item.points > 0 ? "text-green-600" : "text-red-600"}`}>
                  {item.points > 0 ? "+" : ""}{item.points}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Gift className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No points history yet. Start referring friends or shopping to earn points!</p>
            <BrandButton href="/marketplace" variant="primary" className="mt-4">
              Browse Marketplace
            </BrandButton>
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
