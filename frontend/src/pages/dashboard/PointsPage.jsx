import React, { useEffect, useState } from "react";
import { Coins, ArrowUp, ArrowDown, Gift, ShoppingBag, TrendingUp } from "lucide-react";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";

export default function PointsPage() {
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // The /me endpoint returns wallet data with transactions
        const meRes = await api.get("/api/customer/points/me");
        const wallet = meRes.data?.wallet;
        setData({
          balance: wallet?.points_balance || 0,
          lifetime_earned: wallet?.points_earned_total || 0,
          lifetime_redeemed: wallet?.points_redeemed_total || 0
        });
        setTransactions(meRes.data?.transactions || []);
      } catch (error) {
        console.error("Failed to load points:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getTransactionIcon = (type) => {
    switch (type) {
      case "earned":
      case "bonus":
      case "referral":
        return <ArrowUp className="w-4 h-4 text-emerald-600" />;
      case "redeemed":
      case "spent":
        return <ArrowDown className="w-4 h-4 text-red-600" />;
      default:
        return <Coins className="w-4 h-4 text-slate-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="rounded-3xl bg-slate-200 h-40 animate-pulse"></div>
      </div>
    );
  }

  const balance = data?.balance || 0;
  const lifetimeEarned = data?.lifetime_earned || 0;
  const lifetimeRedeemed = data?.lifetime_redeemed || 0;

  return (
    <div className="space-y-6" data-testid="points-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Points</h1>
        <p className="mt-1 text-slate-600">
          Earn points with every purchase and redeem them for discounts.
        </p>
      </div>

      {/* Balance Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#D4A843] to-[#c49a3d] p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white/80 text-sm">Available Points</p>
            <div className="flex items-center gap-3 mt-2">
              <Coins className="w-10 h-10" />
              <span className="text-5xl font-bold">{balance.toLocaleString()}</span>
            </div>
            <p className="text-white/70 text-sm mt-2">
              ≈ TZS {(balance * 10).toLocaleString()} in discounts
            </p>
          </div>
          
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
            onClick={() => window.location.href = "/products"}
            data-testid="redeem-btn"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Redeem at Checkout
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-5" data-testid="stat-balance">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold">{balance.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Current Balance</p>
        </div>

        <div className="rounded-2xl border bg-white p-5" data-testid="stat-earned">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold">{lifetimeEarned.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Lifetime Earned</p>
        </div>

        <div className="rounded-2xl border bg-white p-5" data-testid="stat-redeemed">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
            <Gift className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold">{lifetimeRedeemed.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Total Redeemed</p>
        </div>
      </div>

      {/* How to Earn */}
      <div className="rounded-3xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">How to Earn Points</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50">
            <div className="w-10 h-10 rounded-xl bg-[#2D3E50] flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium">Make Purchases</h3>
              <p className="text-sm text-slate-500 mt-1">
                Earn 1 point for every TZS 1,000 spent
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50">
            <div className="w-10 h-10 rounded-xl bg-[#D4A843] flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium">Refer Friends</h3>
              <p className="text-sm text-slate-500 mt-1">
                Get 500 points for each successful referral
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-3xl border bg-white overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">Points History</h2>
        </div>
        {transactions.length > 0 ? (
          <div className="divide-y">
            {transactions.map((tx, idx) => (
              <div key={tx.id || idx} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === "earned" || tx.type === "bonus" || tx.type === "referral"
                      ? "bg-emerald-100"
                      : "bg-red-100"
                  }`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <p className="font-medium">{tx.description || tx.type}</p>
                    <p className="text-xs text-slate-500">
                      {tx.created_at
                        ? new Date(tx.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                </div>
                <span className={`font-bold ${
                  tx.type === "earned" || tx.type === "bonus" || tx.type === "referral"
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}>
                  {tx.type === "earned" || tx.type === "bonus" || tx.type === "referral" ? "+" : "-"}
                  {Math.abs(tx.points || tx.amount || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Coins className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-slate-500 mt-3">No transactions yet</p>
            <p className="text-sm text-slate-400">Start shopping to earn points!</p>
          </div>
        )}
      </div>
    </div>
  );
}
