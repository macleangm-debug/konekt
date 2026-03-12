import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Coins, TrendingUp, TrendingDown, History, Loader2, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { customerRewardsApi } from "../lib/customerRewardsApi";

export default function MyPointsPage() {
  const [data, setData] = useState({ wallet: null, transactions: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await customerRewardsApi.getMyPoints();
        setData(res.data || { wallet: null, transactions: [] });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const wallet = data.wallet;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="my-points-page">
      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-primary">My Points</h1>
          <p className="mt-2 text-slate-600">
            View your balance, earned points, and redemption activity.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid sm:grid-cols-3 gap-4 md:gap-6"
        >
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Balance</p>
                <p className="text-3xl font-bold text-primary mt-1">
                  {(wallet?.points_balance || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Coins className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Earned</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {(wallet?.points_earned_total || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points Redeemed</p>
                <p className="text-3xl font-bold text-[#D4A843] mt-1">
                  {(wallet?.points_redeemed_total || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#D4A843]/10 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-[#D4A843]" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* How Points Work */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-primary to-[#3d5166] rounded-2xl p-6 text-white"
        >
          <h2 className="text-lg font-bold mb-4">How Points Work</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4A843] text-slate-900 flex items-center justify-center font-bold text-sm flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Refer Friends</p>
                <p className="text-sm text-slate-300">Share your referral link with friends</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4A843] text-slate-900 flex items-center justify-center font-bold text-sm flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Earn Points</p>
                <p className="text-sm text-slate-300">Earn when they make purchases</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4A843] text-slate-900 flex items-center justify-center font-bold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Redeem at Checkout</p>
                <p className="text-sm text-slate-300">Use points for discounts</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Points Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-primary">Points Activity</h2>
                <p className="text-sm text-muted-foreground">Your points transaction history</p>
              </div>
            </div>
          </div>

          {!data.transactions?.length ? (
            <div className="p-12 text-center">
              <Coins className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No points activity yet</h3>
              <p className="text-muted-foreground mt-1">
                Start earning points by referring friends!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.transactions.map((tx, idx) => (
                <motion.div
                  key={tx.id || idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.03 }}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.points >= 0 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {tx.points >= 0 ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {tx.description || tx.transaction_type}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {tx.reference_type && (
                            <span className="capitalize">{tx.reference_type}</span>
                          )}
                          {tx.created_at && (
                            <span> • {new Date(tx.created_at).toLocaleDateString()}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className={`text-lg font-bold ${
                      tx.points >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.points >= 0 ? '+' : ''}{tx.points}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
