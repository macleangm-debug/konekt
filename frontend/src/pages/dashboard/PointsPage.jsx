import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, ArrowUp, ArrowDown, Gift, ShoppingBag, TrendingUp } from "lucide-react";
import api from "../../lib/api";
import { Button } from "../../components/ui/button";
import EmptyStateCard from "../../components/customer/EmptyStateCard";

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
      <div className="p-6 md:p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-slate-200 rounded mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded"></div>
        </div>
        <div className="rounded-3xl bg-slate-200 h-40 animate-pulse"></div>
      </div>
    );
  }

  const balance = data?.balance || 0;

  return (
    <div className="p-6 md:p-8 space-y-8" data-testid="points-page">
      <div className="text-left">
        <h1 className="text-4xl font-bold text-[#2D3E50]">My Points</h1>
        <p className="text-slate-600 mt-2">
          Track your rewards and see how to use them within Konekt.
        </p>
      </div>

      <div className="rounded-3xl bg-gradient-to-r from-[#20364D] to-[#2D3E50] text-white p-6">
        <div className="flex items-center gap-3">
          <Coins className="w-10 h-10 text-[#D4A843]" />
          <div>
            <div className="text-sm text-slate-200">Available Points</div>
            <div className="text-4xl font-bold mt-1">{Number(balance).toLocaleString()}</div>
          </div>
        </div>
        <p className="text-slate-200 mt-3">
          Redeem points on eligible services, products, and selected offers at checkout.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-slate-500">Use Case</div>
          <div className="text-lg font-bold mt-3 text-[#2D3E50]">Creative Services</div>
          <p className="text-slate-600 mt-2">Apply points toward design work like logos, flyers, brochures, and more.</p>
        </div>
        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-slate-500">Use Case</div>
          <div className="text-lg font-bold mt-3 text-[#2D3E50]">Products & Orders</div>
          <p className="text-slate-600 mt-2">Reduce the cost of future product purchases where points are enabled.</p>
        </div>
        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm text-slate-500">Growth Tip</div>
          <div className="text-lg font-bold mt-3 text-[#2D3E50]">Refer More, Earn More</div>
          <p className="text-slate-600 mt-2">The more qualified referrals that buy, the more rewards you unlock.</p>
        </div>
      </div>

      {!transactions?.length ? (
        <EmptyStateCard
          icon={Coins}
          title="No points activity yet"
          text="Start referring people and your points history will appear here."
          ctaLabel="Open Referrals"
          ctaHref="/account/referrals"
          secondaryCtaLabel="Browse Services"
          secondaryCtaHref="/services"
          testId="empty-points"
        />
      ) : (
        <div className="rounded-3xl border bg-white overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-xl font-bold text-[#2D3E50]">Points History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-5 py-4 text-sm font-semibold text-slate-600">Date</th>
                  <th className="px-5 py-4 text-sm font-semibold text-slate-600">Type</th>
                  <th className="px-5 py-4 text-sm font-semibold text-slate-600">Description</th>
                  <th className="px-5 py-4 text-sm font-semibold text-slate-600 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {(transactions || []).map((item, idx) => (
                  <tr key={item.id || idx} className="border-b last:border-b-0 hover:bg-slate-50">
                    <td className="px-5 py-4 text-slate-700">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1">
                        {getTransactionIcon(item.type)}
                        <span className="capitalize">{item.type || "-"}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{item.description || "-"}</td>
                    <td className={`px-5 py-4 text-right font-semibold ${
                      item.type === "earned" || item.type === "bonus" || item.type === "referral"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}>
                      {item.type === "earned" || item.type === "bonus" || item.type === "referral" ? "+" : "-"}
                      {Math.abs(item.points || item.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
