import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Coins, ArrowRight, Copy, Check } from "lucide-react";
import { Button } from "../ui/button";
import api from "../../lib/api";

export default function ReferralPointsBanner({ points: propPoints, referralCode: propCode }) {
  const [referralData, setReferralData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(!propCode && !propPoints);

  useEffect(() => {
    // Only fetch if props not provided
    if (propCode || propPoints !== undefined) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await api.get("/api/customer/referrals/overview").catch(() => ({ data: null }));
        setReferralData(res.data);
      } catch (error) {
        console.error("Failed to load rewards data:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [propCode, propPoints]);

  const copyReferralCode = () => {
    const code = propCode || referralData?.referral_code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border bg-gradient-to-r from-[#2D3E50] to-[#3d5269] p-6 animate-pulse">
        <div className="h-20"></div>
      </div>
    );
  }

  const referralCode = propCode || referralData?.referral_code || "---";
  const pointsBalance = propPoints !== undefined ? propPoints : (referralData?.points_balance || referralData?.wallet?.points_balance || 0);

  return (
    <div
      className="rounded-3xl bg-gradient-to-r from-[#20364D] to-[#2D3E50] text-white p-6"
      data-testid="referral-points-banner"
    >
      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div>
          <div className="text-sm text-slate-200">Referral & Rewards</div>
          <h3 className="text-2xl md:text-3xl font-bold mt-2">
            You have {Number(pointsBalance || 0).toLocaleString()} points ready to use
          </h3>
          <p className="text-slate-200 mt-2 max-w-2xl">
            Share your referral link, earn more points when your referrals complete purchases,
            and use those points on creative services, products, and selected offers within Konekt.
          </p>
          <div className="flex items-center gap-2 text-sm text-[#F7E7B1] mt-3">
            <span>Referral Code: {referralCode}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[#F7E7B1] hover:text-white hover:bg-white/10"
              onClick={copyReferralCode}
              data-testid="copy-referral-code"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Link to="/dashboard/referrals">
            <Button
              className="bg-[#D4A843] hover:bg-[#c49a3d] text-[#20364D]"
              data-testid="refer-friends-btn"
            >
              Refer Friends
            </Button>
          </Link>
          <Link to="/dashboard/points">
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              data-testid="use-points-btn"
            >
              Use My Points
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
