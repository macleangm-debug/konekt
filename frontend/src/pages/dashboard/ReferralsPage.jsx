import React, { useEffect, useState } from "react";
import { Gift, Copy, Check, Users, TrendingUp, Share2 } from "lucide-react";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import ReferralPointsBanner from "../../components/customer/ReferralPointsBanner";
import PromoArtCards from "../../components/customer/PromoArtCards";

export default function ReferralsPage() {
  const [data, setData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // The /me endpoint returns both user data and referral_transactions
        const meRes = await api.get("/api/customer/referrals/me");
        setData(meRes.data);
        setReferrals(meRes.data?.referral_transactions || []);
      } catch (error) {
        console.error("Failed to load referrals:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const copyLink = async () => {
    if (data?.referral_code) {
      const link = `${window.location.origin}/r/${data.referral_code}`;
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied!");
    }
  };

  const shareWhatsApp = () => {
    if (!data?.referral_code) return;
    const link = `${window.location.origin}/r/${data.referral_code}`;
    const message = `Join me on Konekt and get amazing deals on branded merchandise, design services, and office solutions! Use my code: ${data.referral_code} ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="rounded-3xl bg-slate-200 h-48 animate-pulse"></div>
      </div>
    );
  }

  const referralCode = data?.referral_code || "---";
  const referralLink = `${window.location.origin}/r/${referralCode}`;
  const pointsBalance = data?.wallet?.points_balance || 0;

  return (
    <div className="p-6 md:p-8 space-y-8" data-testid="referrals-page">
      <div className="text-left">
        <h1 className="text-4xl font-bold text-[#2D3E50]">Referrals</h1>
        <p className="text-slate-600 mt-2">
          Share your referral link, earn points from successful purchases, and use your rewards throughout Konekt.
        </p>
      </div>

      <ReferralPointsBanner points={pointsBalance} referralCode={referralCode} />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-slate-500">How it works</div>
          <div className="text-lg font-bold mt-3 text-[#2D3E50]">Share your link</div>
          <p className="text-slate-600 mt-2">Invite businesses and contacts who need products or services.</p>
        </div>
        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-slate-500">Reward logic</div>
          <div className="text-lg font-bold mt-3 text-[#2D3E50]">Earn points when they buy</div>
          <p className="text-slate-600 mt-2">Your points increase when your referred client completes an eligible purchase.</p>
        </div>
        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-slate-500">Use rewards</div>
          <div className="text-lg font-bold mt-3 text-[#2D3E50]">Redeem points in the system</div>
          <p className="text-slate-600 mt-2">Use points on selected products, creative services, and future orders.</p>
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-bold text-[#2D3E50]">Your Referral Link</h2>
        <div className="rounded-2xl border bg-slate-50 px-4 py-3 mt-4 break-all text-slate-700">
          {referralLink}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <Button
            onClick={copyLink}
            className="w-full bg-[#2D3E50] hover:bg-[#1e2d3d]"
            data-testid="copy-link-btn"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>

          <Button
            onClick={shareWhatsApp}
            variant="outline"
            className="w-full"
            data-testid="whatsapp-share-btn"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share on WhatsApp
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-bold text-[#2D3E50]">People You Referred</h2>
        <div className="space-y-4 mt-5">
          {(referrals || []).length > 0 ? (
            referrals.map((item, idx) => (
              <div key={item.id || idx} className="rounded-2xl border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="font-medium text-slate-600">
                      {(item.referred_name || item.referred_email || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{item.referred_name || item.referred_email || "User"}</div>
                    <div className="text-sm text-slate-500 mt-1">{item.status || "Joined"}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  Points Earned: {Number(item.points_earned || 0).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500 text-center py-6">
              No referrals yet. Share your link and start earning rewards.
            </div>
          )}
        </div>
      </div>

      <PromoArtCards />
    </div>
  );
}
