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
  const referralCount = referralData?.total_referrals || referralData?.referral_count || 0;
  const pointsBalance = propPoints !== undefined ? propPoints : (referralData?.points_balance || referralData?.wallet?.points_balance || 0);

  return (
    <div
      className="rounded-3xl border bg-gradient-to-r from-[#2D3E50] to-[#3d5269] p-6 text-white"
      data-testid="referral-points-banner"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Referral Section */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6 text-[#D4A843]" />
          </div>
          <div>
            <p className="text-sm text-white/70">Your Referral Code</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold tracking-wider">{referralCode}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                onClick={copyReferralCode}
                data-testid="copy-referral-code"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-sm text-white/50 mt-1">
              {referralCount} {referralCount === 1 ? "referral" : "referrals"} so far
            </p>
          </div>
        </div>

        {/* Points Section */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Coins className="w-6 h-6 text-[#D4A843]" />
          </div>
          <div>
            <p className="text-sm text-white/70">Points Balance</p>
            <p className="text-2xl font-bold mt-1">{Number(pointsBalance).toLocaleString()}</p>
            <p className="text-sm text-white/50 mt-1">Redeem for discounts</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Link to="/dashboard/referrals">
            <Button
              variant="outline"
              className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10"
              data-testid="view-referrals-btn"
            >
              View Referrals
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link to="/dashboard/points">
            <Button
              className="w-full sm:w-auto bg-[#D4A843] hover:bg-[#c49a3d] text-white"
              data-testid="view-points-btn"
            >
              View Points
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
