import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Copy, Check, ArrowRight, Wallet, Users } from "lucide-react";
import { Button } from "../ui/button";
import api from "../../lib/api";
import { toast } from "sonner";

function money(v) {
  return `TZS ${Number(v || 0).toLocaleString()}`;
}

export default function ReferralPointsBanner() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/customer/referrals/overview");
        setData(res.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const copyReferralCode = () => {
    const code = data?.referral_code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border bg-gradient-to-r from-[#20364D] to-[#2D3E50] p-6 animate-pulse">
        <div className="h-24" />
      </div>
    );
  }

  const hasReferrals = data && data.successful_referrals > 0;
  const walletBalance = data?.wallet_balance || 0;
  const totalEarned = data?.total_earned || 0;
  const successfulReferrals = data?.successful_referrals || 0;
  const referralCode = data?.referral_code || "";

  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-[#20364D] via-[#2a4560] to-[#1a2d3f] text-white overflow-hidden"
      data-testid="refer-earn-card"
    >
      <div className="p-6 md:p-8">
        {/* Title Row */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#D4A843]/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-[#D4A843]" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Refer & Earn</h3>
            <p className="text-sm text-slate-300">
              {hasReferrals
                ? "Your referrals are earning you rewards."
                : "Earn rewards when someone you refer completes a purchase."}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-white/8 backdrop-blur-sm p-3" data-testid="wallet-balance-stat">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
              <Wallet className="w-3.5 h-3.5" />
              Wallet Balance
            </div>
            <div className="text-xl font-bold text-[#D4A843]">{money(walletBalance)}</div>
          </div>
          <div className="rounded-xl bg-white/8 backdrop-blur-sm p-3" data-testid="total-earned-stat">
            <div className="text-xs text-slate-300 mb-1">Total Earned</div>
            <div className="text-xl font-bold">{money(totalEarned)}</div>
          </div>
          <div className="rounded-xl bg-white/8 backdrop-blur-sm p-3" data-testid="successful-referrals-stat">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
              <Users className="w-3.5 h-3.5" />
              Referrals
            </div>
            <div className="text-xl font-bold">{successfulReferrals}</div>
          </div>
        </div>

        {/* Progress Indicator */}
        {data?.milestones?.referrals?.next_target && (
          <div className="mb-5" data-testid="dashboard-milestone-progress">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-300">
                {successfulReferrals} referral{successfulReferrals !== 1 ? "s" : ""} completed
              </span>
              <span className="text-xs text-slate-400">
                Next: {data.milestones.referrals.next_target}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D4A843] transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round(
                    (successfulReferrals / data.milestones.referrals.next_target) * 100
                  ))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={copyReferralCode}
            className="bg-[#D4A843] hover:bg-[#c49a3d] text-[#20364D] font-semibold gap-2"
            data-testid="copy-referral-link-btn"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Link to="/account/referrals">
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 gap-2"
              data-testid="view-referral-details-btn"
            >
              View Details
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          {referralCode && (
            <span className="text-xs text-slate-400 ml-auto hidden md:block">
              Code: <span className="font-mono text-slate-300">{referralCode}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
