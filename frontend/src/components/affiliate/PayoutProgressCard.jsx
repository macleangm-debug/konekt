import React from "react";
import { Target, TrendingUp, CheckCircle } from "lucide-react";

export default function PayoutProgressCard({ progress }) {
  const {
    current_balance = 0,
    threshold = 50000,
    remaining_to_threshold = 50000,
    progress_percent = 0,
    ready_for_payout = false,
  } = progress || {};

  return (
    <div
      className="rounded-2xl border bg-gradient-to-br from-white to-slate-50 p-6"
      data-testid="payout-progress-card"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#D4A843]/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-[#D4A843]" />
        </div>
        <div>
          <div className="font-semibold text-[#20364D]">Next Payout Progress</div>
          <div className="text-xs text-slate-500">Minimum threshold: TZS {threshold.toLocaleString()}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-600">
            TZS {current_balance.toLocaleString()}
          </span>
          <span className="font-medium text-[#20364D]">{progress_percent.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              ready_for_payout
                ? "bg-green-500"
                : "bg-gradient-to-r from-[#D4A843] to-[#C49A3A]"
            }`}
            style={{ width: `${Math.min(100, progress_percent)}%` }}
          />
        </div>
      </div>

      {/* Status */}
      {ready_for_payout ? (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">You can request a payout!</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-slate-600 bg-slate-100 rounded-xl px-4 py-3">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm">
            You need <strong>TZS {remaining_to_threshold.toLocaleString()}</strong> more to reach the payout threshold
          </span>
        </div>
      )}
    </div>
  );
}
