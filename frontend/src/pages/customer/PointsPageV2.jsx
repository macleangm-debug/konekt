import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Gift, Users, Copy, Check, TrendingUp, Award } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import SurfaceCard from "../../components/ui/SurfaceCard";
import MetricCard from "../../components/ui/MetricCard";
import BrandButton from "../../components/ui/BrandButton";
import axios from "axios";

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
          referralCode: referralRes.data?.referral_code || "",
          referralCount: referralRes.data?.total_referrals || 0,
          referralEarnings: referralRes.data?.total_earnings || 0,
        });
        setHistory(historyRes.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const copyReferralLink = () => {
    const link = `${window.location.origin}/r/${loyaltyData.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tierBenefits = {
    Bronze: ["1% cashback on orders", "Birthday reward", "Early access to sales"],
    Silver: ["2% cashback on orders", "Priority support", "Exclusive offers"],
    Gold: ["3% cashback on orders", "Free shipping", "VIP events"],
    Platinum: ["5% cashback on orders", "Dedicated account manager", "All benefits"],
  };

  return (
    <div data-testid="points-page">
      <PageHeader 
        title="Points & Referrals"
        subtitle="Earn rewards and invite friends to earn more."
      />

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
          label="Referrals" 
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
        {/* Referral Section */}
        <SurfaceCard>
          <h2 className="text-lg font-bold text-[#20364D] mb-4">Invite Friends & Earn</h2>
          <p className="text-slate-600 mb-4">
            Share your referral link and earn rewards when friends make their first purchase.
          </p>
          
          {loyaltyData.referralCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/r/${loyaltyData.referralCode}`}
                  readOnly
                  className="flex-1 border rounded-xl px-4 py-3 bg-slate-50 text-sm"
                />
                <button
                  onClick={copyReferralLink}
                  className="p-3 rounded-xl border hover:bg-slate-50 transition"
                >
                  {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-sm text-slate-500">
                Your referral code: <span className="font-mono font-bold">{loyaltyData.referralCode}</span>
              </p>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500">
              Loading your referral code...
            </div>
          )}
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
            No points history yet. Start shopping to earn points!
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
