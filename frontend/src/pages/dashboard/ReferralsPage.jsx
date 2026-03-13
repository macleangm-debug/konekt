import React, { useEffect, useState } from "react";
import { Gift, Copy, Check, Users, TrendingUp, Share2 } from "lucide-react";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

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

  const copyCode = () => {
    if (data?.referral_code) {
      navigator.clipboard.writeText(data.referral_code);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyLink = () => {
    if (data?.referral_code) {
      const link = `${window.location.origin}/r/${data.referral_code}`;
      navigator.clipboard.writeText(link);
      toast.success("Referral link copied!");
    }
  };

  const shareReferral = async () => {
    if (!data?.referral_code) return;
    
    const link = `${window.location.origin}/r/${data.referral_code}`;
    const text = `Join me on Konekt and get amazing deals on branded merchandise! Use my code: ${data.referral_code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join Konekt", text, url: link });
      } catch (e) {
        // User cancelled
      }
    } else {
      copyLink();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="rounded-3xl bg-slate-200 h-48 animate-pulse"></div>
      </div>
    );
  }

  const referralCode = data?.referral_code || "---";
  const referralCount = data?.referral_count || referrals.length || 0;
  const totalEarnings = data?.total_earnings || 0;

  return (
    <div className="space-y-6" data-testid="referrals-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Referrals</h1>
        <p className="mt-1 text-slate-600">
          Share your code with friends and earn rewards when they make their first purchase.
        </p>
      </div>

      {/* Referral Code Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#2D3E50] to-[#3d5269] p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white/70 text-sm">Your Referral Code</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-4xl font-bold tracking-widest">{referralCode}</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={copyCode}
                data-testid="copy-code-btn"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={copyLink}
              data-testid="copy-link-btn"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button
              className="bg-[#D4A843] hover:bg-[#c49a3d]"
              onClick={shareReferral}
              data-testid="share-btn"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-5" data-testid="stat-referrals">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold">{referralCount}</p>
          <p className="text-sm text-slate-500 mt-1">Total Referrals</p>
        </div>

        <div className="rounded-2xl border bg-white p-5" data-testid="stat-completed">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
            <Gift className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold">
            {referrals.filter(r => r.status === "completed" || r.has_purchased).length}
          </p>
          <p className="text-sm text-slate-500 mt-1">Successful Referrals</p>
        </div>

        <div className="rounded-2xl border bg-white p-5" data-testid="stat-earnings">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold">TZS {totalEarnings.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Total Earnings</p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-[#D4A843] font-bold">1</span>
            </div>
            <h3 className="font-medium">Share Your Code</h3>
            <p className="text-sm text-slate-500 mt-1">
              Send your unique code to friends and colleagues
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-[#D4A843] font-bold">2</span>
            </div>
            <h3 className="font-medium">They Sign Up</h3>
            <p className="text-sm text-slate-500 mt-1">
              Your friends create an account using your code
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#D4A843]/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-[#D4A843] font-bold">3</span>
            </div>
            <h3 className="font-medium">Both Earn Rewards</h3>
            <p className="text-sm text-slate-500 mt-1">
              You both get points when they make their first purchase
            </p>
          </div>
        </div>
      </div>

      {/* Referral List */}
      <div className="rounded-3xl border bg-white overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">Your Referrals</h2>
        </div>
        {referrals.length > 0 ? (
          <div className="divide-y">
            {referrals.map((ref, idx) => (
              <div key={ref.id || idx} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="font-medium text-slate-600">
                      {(ref.referred_name || ref.referred_email || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{ref.referred_name || ref.referred_email || "User"}</p>
                    <p className="text-xs text-slate-500">
                      {ref.created_at
                        ? new Date(ref.created_at).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ref.status === "completed" || ref.has_purchased
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {ref.status === "completed" || ref.has_purchased ? "Completed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Gift className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-slate-500 mt-3">No referrals yet</p>
            <p className="text-sm text-slate-400">Share your code to start earning!</p>
          </div>
        )}
      </div>
    </div>
  );
}
