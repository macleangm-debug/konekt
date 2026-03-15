import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Coins, Info } from "lucide-react";
import api from "../../lib/api";

export default function PointsUsageBox({ subtotal = 0, onApplied }) {
  const { user } = useAuth();
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const res = await api.get("/api/auth/me");
        setPointsBalance(Number(res.data?.credit_balance || 0));
      } catch (error) {
        console.error("Failed to fetch points:", error);
        setPointsBalance(0);
      } finally {
        setLoading(false);
      }
    };
    fetchPoints();
  }, []);

  useEffect(() => {
    if (!loading && onApplied) {
      const usablePoints = Math.min(pointsBalance, Math.floor(subtotal));
      onApplied({
        points_balance: pointsBalance,
        usable_points: usablePoints,
        discount_value: usablePoints, // 1 point = 1 TZS
      });
    }
  }, [pointsBalance, subtotal, loading, onApplied]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-slate-50 p-4 animate-pulse" data-testid="points-usage-box-loading">
        <div className="h-5 w-32 bg-slate-200 rounded"></div>
        <div className="h-4 w-48 bg-slate-200 rounded mt-2"></div>
      </div>
    );
  }

  if (pointsBalance <= 0) {
    return null;
  }

  const usablePoints = Math.min(pointsBalance, Math.floor(subtotal));
  const discountValue = usablePoints;

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-[#D4A843]/10 to-[#D4A843]/5 p-5" data-testid="points-usage-box">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#D4A843]/20 flex items-center justify-center flex-shrink-0">
          <Coins className="w-5 h-5 text-[#D4A843]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-600">Your Points Balance</div>
            <div className="text-lg font-bold text-[#2D3E50]">
              {pointsBalance.toLocaleString()} pts
            </div>
          </div>

          {usablePoints > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-white/80 border border-[#D4A843]/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Available to apply:</span>
                <span className="font-semibold text-[#2D3E50]">
                  {usablePoints.toLocaleString()} pts
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-slate-600">Discount value:</span>
                <span className="font-semibold text-emerald-600">
                  TZS {discountValue.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {usablePoints === 0 && subtotal > 0 && (
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Points cannot be applied to this balance.</span>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-3">
            1 point = 1 TZS discount. Points are applied after clicking the apply button.
          </p>
        </div>
      </div>
    </div>
  );
}
